import { expect, test, type Page } from '@playwright/test';

// The lab must work offline: block every external request and fail if the app tried any.
let external: string[] = [];
test.beforeEach(async ({ page }) => {
  external = [];
  await page.route(/^https?:\/\/(?!localhost[:/])/, (route) => {
    external.push(route.request().url());
    return route.abort();
  });
});
test.afterEach(() => {
  expect(external, 'external requests').toEqual([]);
});

async function openFirstLesson(page: Page) {
  await page.goto('/sql');
  await expect(page.getByRole('heading', { level: 1, name: 'SELECT All Columns' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run Query' })).toBeEnabled();
}

async function typeQuery(page: Page, sql: string) {
  await page.getByTestId('query-editor').locator('.monaco-editor').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Delete');
  await page.keyboard.insertText(sql);
  await expect(page.getByTestId('query-editor')).toContainText(sql.replace(/;$/, ''));
}

test('the solution passes and the lesson is marked complete', async ({ page }) => {
  await openFirstLesson(page);
  await page.getByRole('button', { name: /Solution/ }).click();
  await page.getByRole('button', { name: 'Load into editor' }).click();
  await page.getByRole('button', { name: 'Run Query' }).click();
  await expect(page.getByText('Correct!')).toBeVisible();
  await expect(page.getByRole('link', { name: /SELECT All Columns/ }).getByLabel('completed')).toBeVisible();
});

test('a wrong answer explains the difference', async ({ page }) => {
  await openFirstLesson(page);
  await typeQuery(page, 'SELECT 1 AS x;');
  await page.getByRole('button', { name: 'Run Query' }).click();
  await expect(page.getByText('Not quite.')).toBeVisible();
  await page.getByRole('button', { name: 'Show difference' }).click();
  await expect(page.getByRole('region', { name: 'Expected result' })).toBeVisible();
});

test('SQL errors are shown', async ({ page }) => {
  await openFirstLesson(page);
  await typeQuery(page, 'SELECT * FORM users;');
  await page.getByRole('button', { name: 'Run Query' }).click();
  // Monaco renders its own empty aria-live alert regions inside the editor; scope to the
  // app's error banner (the only alert with visible text) to avoid a strict-mode violation.
  await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText('syntax error');
});

test('hints toggle', async ({ page }) => {
  await openFirstLesson(page);
  await page.getByRole('button', { name: 'Show hint' }).click();
  await expect(page.getByRole('button', { name: 'Hide hint' })).toBeVisible();
});

test('Reset DB restores a dropped table', async ({ page }) => {
  await openFirstLesson(page);
  await typeQuery(page, 'DROP TABLE reviews;');
  await page.getByRole('button', { name: 'Run Query' }).click();
  await expect(page.getByText(/use Reset DB/)).toBeVisible();
  await page.getByRole('button', { name: 'Reset DB' }).click();
  await expect(page.getByText('Database reset to the lesson data.')).toBeVisible();
  await page.getByRole('tab', { name: 'Database Schema' }).click();
  await expect(page.getByRole('button', { name: /^reviews/ }).first()).toBeVisible();
});

test('theme toggle switches data-theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await openFirstLesson(page);
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('mobile drawer opens, navigates and closes', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await openFirstLesson(page);
  const sidebar = page.getByRole('complementary', { name: 'Lesson list' });
  await expect(sidebar).not.toBeInViewport();
  await page.getByRole('button', { name: 'Open lesson list' }).click();
  await expect(sidebar).toBeInViewport();
  await sidebar.getByRole('link', { name: /SELECT Specific Columns/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'SELECT Specific Columns' })).toBeVisible();
  await expect(sidebar).not.toBeInViewport();
});

test('the Watch it happen player steps and jumps to the end', async ({ page }) => {
  await openFirstLesson(page);
  const player = page.getByRole('group', { name: 'Watch it happen' });
  await expect(player).toBeVisible();
  await player.getByRole('button', { name: 'Next step' }).click();
  await expect(player.getByRole('button', { name: 'One shopper' })).toHaveAttribute('aria-current', 'step');
  const labels = player.getByRole('listitem');
  await labels.last().getByRole('button').click();
  await expect(player.getByRole('button', { name: 'Replay' })).toBeVisible();
  await expect(player.getByRole('button', { name: 'Next step' })).toBeDisabled();
});

test('the sidebar marks animated lessons and opens only the current chapter', async ({ page }) => {
  await openFirstLesson(page);
  const sidebar = page.getByRole('complementary', { name: 'Lesson list' });
  await expect(sidebar.getByRole('heading', { name: 'The SQL Codex' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: /SELECT All Columns/ }).getByLabel('has animation')).toBeVisible();
  await expect(sidebar.getByRole('link', { name: /FOREIGN KEY Constraint/ })).toHaveCount(0);
  await expect(sidebar.getByRole('button', { name: /Data Types & Constraints/i })).toHaveAttribute('aria-expanded', 'false');
  await sidebar.getByRole('button', { name: /Data Types & Constraints/i }).click();
  await expect(sidebar.getByRole('link', { name: /FOREIGN KEY Constraint/ })).toBeAttached();
});

for (const width of [600, 375]) {
  for (const lesson of ['select-all', 'foreign-key']) {
    test(`the page never scrolls sideways at ${width}px (${lesson})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/sql/lessons/${lesson}`);
      await expect(page.getByRole('group', { name: 'Watch it happen' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Run Query' })).toBeEnabled();
      const overflow = await page.evaluate(() => {
        const main = document.querySelector('main');
        return {
          page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          main: main ? main.scrollWidth - main.clientWidth : 0,
          hasMain: main !== null,
        };
      });
      expect(overflow.hasMain).toBe(true);
      expect(overflow.page).toBeLessThanOrEqual(0);
      expect(overflow.main).toBeLessThanOrEqual(0);
    });
  }
}

test('LeetLab: load the database, solve, and see Correct!', async ({ page }) => {
  await page.goto('/sql/problems/out-of-stock');
  await expect(page.getByRole('heading', { level: 1, name: 'Out of Stock' })).toBeVisible();
  await expect(page.getByText(/Load (the )?challenge database/i).first()).toBeVisible();
  await page.getByRole('button', { name: 'Load Database' }).click();
  await expect(page.getByRole('button', { name: 'Database Loaded' })).toBeDisabled();
  await typeQuery(page, 'SELECT item_name FROM items WHERE on_hand = 0;');
  await page.getByRole('button', { name: 'Run Query' }).click();
  await expect(page.getByText('Correct!')).toBeVisible();
});

test('LeetLab: panes resize with the keyboard', async ({ page }) => {
  await page.goto('/sql/problems/out-of-stock');
  // ArrowLeft moves the vertical bar between the two columns (the row splits take ArrowUp/Down).
  const sep = page.getByRole('separator', { name: 'Resize the two columns' });
  const before = await sep.getAttribute('aria-valuenow');
  await sep.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(sep).not.toHaveAttribute('aria-valuenow', before ?? '');
});

test('text size: XL preset sets every slider to 125%', async ({ page }) => {
  await page.goto('/sql/lessons/select-all');
  await page.getByRole('button', { name: 'Text size settings' }).click();
  await page.getByRole('button', { name: 'XL' }).click();
  await expect(page.getByRole('dialog', { name: 'Text size' }).getByText('125%')).toHaveCount(5);
});

test('LeetLab never scrolls sideways at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/sql/problems/out-of-stock');
  await expect(page.getByRole('heading', { level: 1, name: 'Out of Stock' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run Query' })).toBeVisible();
  const overflow = await page.evaluate(() => {
    const main = document.querySelector('main');
    return {
      page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      main: main ? main.scrollWidth - main.clientWidth : 0,
      hasMain: main !== null,
    };
  });
  expect(overflow.hasMain).toBe(true);
  expect(overflow.page).toBeLessThanOrEqual(0);
  expect(overflow.main).toBeLessThanOrEqual(0);
});

for (const width of [900, 1280]) {
  test(`LeetLab: Run Query is never clipped at ${width}px, even with the columns squeezed`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/sql/problems/out-of-stock');
    const editor = page.getByRole('region', { name: 'SQL editor' });
    await expect(editor).toBeVisible();
    await expect(page.getByRole('region', { name: 'Query output' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Out of Stock' })).toBeVisible();
    // Push the column split as far right as it goes: the editor column stops at its pixel floor.
    const sep = page.getByRole('separator', { name: 'Resize the two columns' });
    await sep.focus();
    await page.keyboard.press('End');
    const run = editor.getByRole('button', { name: 'Run Query' });
    await expect(run).toBeVisible();
    const [box, card] = await Promise.all([run.boundingBox(), editor.boundingBox()]);
    expect(box && card).toBeTruthy();
    expect(box!.x).toBeGreaterThanOrEqual(card!.x);
    expect(box!.x + box!.width).toBeLessThanOrEqual(card!.x + card!.width);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  });
}

test('the full-height strip hides and shows the lesson list, and remembers it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/sql/lessons/select-all');
  await expect(page.getByRole('heading', { level: 1, name: 'SELECT All Columns' })).toBeVisible();
  const sidebar = page.getByRole('complementary', { name: 'Lesson list' });
  const main = page.locator('main');
  await expect(sidebar).toBeVisible();
  const before = (await main.boundingBox())!.width;

  await page.getByRole('button', { name: 'Hide lesson list' }).click();
  await expect(sidebar).toBeHidden();
  await expect(page.getByRole('button', { name: 'Show lesson list' })).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(async () => (await main.boundingBox())!.width).toBeGreaterThan(before);

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'SELECT All Columns' })).toBeVisible();
  await expect(sidebar).toBeHidden();

  await page.getByRole('button', { name: 'Show lesson list' }).click();
  await expect(sidebar).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hide lesson list' })).toHaveAttribute('aria-expanded', 'true');
});

test('the strip is not rendered below the desktop breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await openFirstLesson(page);
  await expect(page.getByRole('button', { name: 'Hide lesson list' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open lesson list' })).toBeVisible();
});

test.describe('home page', () => {
  test('renders every band and leads into the first lesson, offline', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Pull up a chair');
    const labs = page.getByRole('region', { name: 'Four labs are open.' });
    await expect(labs.getByRole('listitem')).toHaveCount(4);
    await expect(labs.getByRole('link', { name: /Redis/ })).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Read, run, check, repeat' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Built so practice turns into habit.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The database is already running.' })).toBeVisible();
    await expect(page.getByRole('contentinfo')).toContainText('CodeAdda');
    await page.getByRole('link', { name: 'Start the SQL lab' }).click();
    await expect(page).toHaveURL(/\/sql\/lessons\/select-all$/);
    await expect(page.getByRole('heading', { level: 1, name: 'SELECT All Columns' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run Query' })).toBeEnabled();
  });

  for (const [width, height] of [[375, 812], [1024, 768]] as const) {
    test(`never scrolls sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await expect(page.getByText('Correct!')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('renders in dark mode from saved prefs', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('codeadda:prefs', JSON.stringify({ theme: 'dark' })));
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('shows the Correct! pill immediately when motion is reduced', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByText('Correct!')).toBeVisible({ timeout: 1500 });
  });

  test('does not download the editor', async ({ page }) => {
    const urls: string[] = [];
    page.on('request', (r) => urls.push(r.url()));
    await page.goto('/');
    await expect(page.getByText('Correct!')).toBeVisible();
    expect(urls.filter((u) => /monaco/i.test(u))).toEqual([]);
  });
});

test('navbar on a phone: lab links swipe without a scrollbar and the page never scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Labs' });
  await expect(nav.getByRole('link', { name: 'CodeAdda home' })).toBeVisible();
  await expect(nav.getByRole('button', { name: /Switch to (dark|light) mode/ })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'SQL Lab', exact: true })).toBeInViewport();

  const strip = page.getByTestId('lab-links');
  expect(await strip.evaluate((el) => getComputedStyle(el).scrollbarWidth)).toBe('none');
  await strip.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
  // 0.95, not 1: the scroll end lands on a sub-pixel position.
  await expect(nav.getByText('Redis')).toBeInViewport({ ratio: 0.95 });
  await expect(nav.getByText('Redis')).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test.describe('postgres lab', () => {
  test('the first lesson solves, and the skip banner jumps to Intermediate without a reload', async ({ page }) => {
    await page.goto('/postgres');
    await expect(page.getByRole('heading', { level: 1, name: 'Your first query' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run Query' })).toBeEnabled();
    await page.getByRole('button', { name: /Solution/ }).click();
    await page.getByRole('button', { name: 'Load into editor' }).click();
    await page.getByRole('button', { name: 'Run Query' }).click();
    await expect(page.getByText('Correct!')).toBeVisible();

    await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
    await page.getByRole('link', { name: 'Skip to Intermediate →' }).click();
    await expect(page).toHaveURL(/\/postgres\/lessons\/inner-join$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Inner join' })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
  });

  test('a JSONB lesson solves end to end', async ({ page }) => {
    await page.goto('/postgres/lessons/reading-values');
    await expect(page.getByRole('button', { name: 'Run Query' })).toBeEnabled();
    await page.getByRole('button', { name: /Solution/ }).click();
    await page.getByRole('button', { name: 'Load into editor' }).click();
    await page.getByRole('button', { name: 'Run Query' }).click();
    await expect(page.getByText('Correct!')).toBeVisible();
  });

  test('the sidebar shows the three levels and the home page links to the lab', async ({ page }) => {
    await page.goto('/postgres/lessons/first-query');
    const chapters = page.getByRole('navigation', { name: 'Chapters' });
    await expect(chapters.getByRole('heading', { level: 3 })).toHaveText(['Beginner', 'Intermediate', 'Advanced']);
    await page.goto('/');
    const labs = page.getByRole('region', { name: 'Four labs are open.' });
    await expect(labs.getByRole('link', { name: /PostgreSQL/ })).toHaveAttribute('href', '/postgres');
  });
});

test.describe('lazy lab content', () => {
  const contentRequests = (page: Page) => {
    const urls: string[] = [];
    page.on('request', (r) => { if (r.url().includes('lab-content/')) urls.push(r.url()); });
    return urls;
  };

  test('the home page downloads no lab content', async ({ page }) => {
    const urls = contentRequests(page);
    await page.goto('/');
    await expect(page.getByText('Correct!')).toBeVisible();
    expect(urls).toEqual([]);
  });

  test('a deep link loads only that lab, and switching labs loads the other one', async ({ page }) => {
    const urls = contentRequests(page);
    await page.goto('/postgres/lessons/reading-values');
    await expect(page.getByRole('heading', { level: 1, name: 'Reading JSONB values' })).toBeVisible();
    expect(urls.some((u) => u.includes('lab-content/postgres'))).toBe(true);
    expect(urls.some((u) => u.includes('lab-content/sql'))).toBe(false);
    await page.getByRole('navigation', { name: 'Labs' }).getByRole('link', { name: 'SQL Lab', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'SELECT All Columns' })).toBeVisible();
    expect(urls.some((u) => u.includes('lab-content/sql'))).toBe(true);
  });

  test('an unknown lab shows the 404 page without loading content', async ({ page }) => {
    const urls = contentRequests(page);
    await page.goto('/nope');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    expect(urls).toEqual([]);
  });
});

test.describe('mongodb lab', () => {
  test('the first lesson solves, and the editor title reads MongoDB shell', async ({ page }) => {
    await page.goto('/mongodb');
    await expect(page.getByRole('heading', { level: 1, name: 'Your first find' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'MongoDB shell' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run Query' })).toBeEnabled();
    await page.getByRole('button', { name: /Solution/ }).click();
    await page.getByRole('button', { name: 'Load into editor' }).click();
    await page.getByRole('button', { name: 'Run Query' }).click();
    await expect(page.getByText('Correct!')).toBeVisible();
  });

  test.describe('redis lab', () => {
    test('the first lesson solves and the editor is Redis CLI', async ({ page }) => {
      await page.goto('/redis');
      await expect(page.getByRole('heading', { level: 1, name: 'Your first key' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Redis CLI' })).toBeVisible();
      await page.getByRole('button', { name: /Solution/ }).click();
      await page.getByRole('button', { name: 'Load into editor' }).click();
      await page.getByRole('button', { name: 'Run Query' }).click();
      await expect(page.getByText('Correct!')).toBeVisible();
    });

    test('skip banner reaches the first Sets lesson without a reload', async ({ page }) => {
      await page.goto('/redis');
      await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
      await page.getByRole('link', { name: 'Skip to Intermediate →' }).click();
      await expect(page).toHaveURL(/\/redis\/lessons\/sadd-smembers$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Unique members' })).toBeVisible();
      expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
    });

    test('switches between Table and Transcript results', async ({ page }) => {
      await page.goto('/redis');
      await page.getByRole('button', { name: /Solution/ }).click();
      await page.getByRole('button', { name: 'Load into editor' }).click();
      await page.getByRole('button', { name: 'Run Query' }).click();
      const viewToggle = page.getByRole('radiogroup', { name: 'Results view' });
      await expect(viewToggle).toBeVisible();
      await viewToggle.getByRole('radio', { name: 'Transcript' }).click();
      await expect(page.locator('.fs-results').last()).toContainText('redis>');
      await viewToggle.getByRole('radio', { name: 'Table' }).click();
      await expect(page.locator('.fs-results').last().getByRole('table')).toBeVisible();
    });

    test('schema groups user keys and shows sample data', async ({ page }) => {
      await page.goto('/redis');
      await page.getByRole('tab', { name: 'Database Schema' }).click();
      const users = page.getByRole('button', { name: /^user:\*/ }).first();
      await expect(users).toContainText('12 keys');
      await users.click();
      await users.locator('xpath=..').getByRole('button', { name: /View sample data/i }).click();
      await expect(page.getByRole('tab', { name: 'Query Results' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('.fs-results')).toContainText('Amina Rao');
    });

    test('consumer groups lesson solves end to end', async ({ page }) => {
      await page.goto('/redis/lessons/consumer-groups');
      await page.getByRole('button', { name: /Solution/ }).click();
      await page.getByRole('button', { name: 'Load into editor' }).click();
      await page.getByRole('button', { name: 'Run Query' }).click();
      await expect(page.getByText('Correct!')).toBeVisible();
    });

    test('home links to Redis without loading lab content', async ({ page }) => {
      const urls: string[] = [];
      page.on('request', (request) => { if (request.url().includes('lab-content/')) urls.push(request.url()); });
      await page.goto('/');
      const labs = page.getByRole('region', { name: 'Four labs are open.' });
      await expect(labs.getByRole('link', { name: /Redis/ })).toHaveAttribute('href', '/redis');
      await expect(page.getByText('Coming soon')).toHaveCount(0);
      expect(urls).toEqual([]);
    });
  });

  test('skip banner jumps to Intermediate without a reload', async ({ page }) => {
    await page.goto('/mongodb');
    await expect(page.getByRole('heading', { level: 1, name: 'Your first find' })).toBeVisible();
    await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
    await page.getByRole('link', { name: 'Skip to Intermediate →' }).click();
    await expect(page).toHaveURL(/\/mongodb\/lessons\/or-and$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Combining conditions with $or and $and' })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
  });

  test('results toggle switches between Table and Documents view', async ({ page }) => {
    await page.goto('/mongodb');
    await page.getByRole('button', { name: /Solution/ }).click();
    await page.getByRole('button', { name: 'Load into editor' }).click();
    await page.getByRole('button', { name: 'Run Query' }).click();
    await expect(page.getByText('Correct!')).toBeVisible();

    const resultsPanel = page.locator('.fs-results');
    const viewToggle = page.getByRole('radiogroup', { name: 'Results view' });
    await expect(viewToggle).toBeVisible();
    await viewToggle.getByRole('radio', { name: 'Documents' }).click();
    await expect(resultsPanel.locator('pre').first()).toContainText('_id');
    await viewToggle.getByRole('radio', { name: 'Table' }).click();
    await expect(resultsPanel.getByRole('table')).toBeVisible();
  });

  test('schema panel displays collections and View sample data shows 3 documents', async ({ page }) => {
    await page.goto('/mongodb');
    await page.getByRole('tab', { name: 'Database Schema' }).click();
    await expect(page.getByRole('button', { name: /^movies/ }).first()).toBeVisible();
    await page.getByRole('button', { name: /^movies/ }).first().click();
    await page.getByRole('button', { name: 'View sample data' }).click();
    await expect(page.getByRole('tab', { name: 'Query Results' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText(/3 documents/)).toBeVisible();
  });

  test('a $lookup lesson solves end to end', async ({ page }) => {
    await page.goto('/mongodb/lessons/lookup');
    await expect(page.getByRole('button', { name: 'Run Query' })).toBeEnabled();
    await page.getByRole('button', { name: /Solution/ }).click();
    await page.getByRole('button', { name: 'Load into editor' }).click();
    await page.getByRole('button', { name: 'Run Query' }).click();
    await expect(page.getByText('Correct!')).toBeVisible();
  });

  test('home page links to MongoDB and does not load lab content', async ({ page }) => {
    const urls: string[] = [];
    page.on('request', (r) => { if (r.url().includes('lab-content/')) urls.push(r.url()); });
    await page.goto('/');
    const labs = page.getByRole('region', { name: 'Four labs are open.' });
    await expect(labs.getByRole('link', { name: /MongoDB/ })).toHaveAttribute('href', '/mongodb');
    expect(urls).toEqual([]);
  });
});
