# Stage 2: PostgreSQL Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a self-contained PostgreSQL lab (18 chapters, 46 lessons, 12 problems, beginner → advanced) on a new food-delivery dataset, plus four small data-driven code changes (sidebar levels, skip-to-Intermediate banner, header name, home page pill/card).

**Architecture:** The lab is content under `content/postgres/` and reuses the existing PGlite engine (`language: "sql"`), lesson format, grader and checker. `lab.json` gains an optional `levels` list; the content loader validates and passes it through; navigation helpers derive level headings and the skip target; the sidebar and lesson flow render them. Home page helpers become multi-lab aware.

**Tech Stack:** React 19, React Router 7, TypeScript (strict), Tailwind v4, Zod (content schema), PGlite 0.3.16, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-01-stage-2-postgres-lab-design.md`

## Global Constraints

- **No git commits, adds or stashes by implementers.** The user commits on `feature/stage-2-postgres-lab`. Each task ends with a working-tree snapshot (`bash .superpowers/sdd/<plan-workspace>/snap.sh`) instead of a commit.
- No new npm dependencies. No `dark:` Tailwind utilities. No raw hex colours outside `apps/web/src/styles/tokens.css`. No external URLs; the e2e offline guard aborts every non-localhost request.
- Content is original: nothing copied from labs.chaicode.com, the PostgreSQL manual or other sites. No "Chai" wording.
- The SQL lab's content (`content/sql/**`) is not touched.
- Lab values: `id "postgres"`, `title "PostgreSQL Lab"`, `language "sql"`, subtitle "From your first table to JSONB and window functions", sidebarTitle "The Postgres Path", sidebarSubtitle "Beginner to advanced, one query at a time", problemsSubtitle "Practice problems on the food-delivery database", problemGroups `["Warm-up", "Everyday Postgres", "Power features"]`, levels Beginner from "Meet Postgres", Intermediate from "Joins and relationships", Advanced from "Arrays".
- Writing rules for every lesson and problem: hints point the way without giving the answer away; every example runs and returns real rows; plain words for beginners, one idea per lesson; every lesson has a `## Context` section; never `now()`, `current_date`, `random()` or anything run-dependent in a checked answer; `EXPLAIN` is never graded on plan text (use `check: custom` on `pg_indexes`); transaction lessons use `check: state`; rows-checked solutions return at least one row.
- Problems follow the existing LeetLab format exactly (own `## Tables`, `## Example`, `## Setup`, `## Solution`, a `difficulty`, no `dataset`), as enforced for SQL by `scripts/sqlLabShape.test.ts`. (Clarifies spec §4.4, which allowed `dataset: food`: the LeetLab workspace and its "Load Database" button expect each problem to carry its own setup.)
- Verification commands: `npm run typecheck`, `npx vitest run <files>`, `npm test`, `npm run check-content`, `npm run e2e` (Playwright starts its own dev server on port 5199).

## Review Focus

1. **A correct beginner answer written differently** (columns in another order, `int` instead of `integer`, extra whitespace) must still pass its `state` check. Pinned in Task 13 (`scripts/postgresChecks.test.ts`, "accepts equivalent answers").
2. **Doing nothing** (running `SELECT 1;`) must never pass a `state` or `custom` lesson. Pinned in Task 13 (`scripts/postgresChecks.test.ts`, "never passes a no-op").
3. **A learner who knows SQL** clicks the skip banner on lesson 1 and lands on the first Intermediate lesson without a page reload. Pinned in Task 13 (e2e).
4. **A typo in a level's `from`** is reported as a content error and the sidebar shows no heading for it. Pinned in Task 1 (`buildLab.test.ts`) and Task 2 (`Sidebar.test.tsx`).
5. **A lab without levels** (the SQL lab) shows no level headings and no skip banner. Pinned in Task 2 (`Sidebar.test.tsx`) and Task 3 (`LessonFlow.test.tsx`).

---

### Task 1: `levels` in the lab schema, type and loader

**Files:**
- Modify: `packages/content-loader/src/schema.ts` (`labJson`)
- Modify: `packages/core/src/types.ts` (`Lab`)
- Modify: `packages/content-loader/src/buildLab.ts`
- Test: `packages/content-loader/src/buildLab.test.ts` (append)

**Interfaces:**
- Produces: `interface LabLevel { title: string; from: string }` exported from `@codeadda/core`; `Lab.levels?: LabLevel[]` (only valid levels, in lab.json order; property omitted when lab.json has none).

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe('buildLab', …)` block in `packages/content-loader/src/buildLab.test.ts`:

```ts
  it('passes levels through when every "from" is a chapter', () => {
    const lab = buildLab({
      labJson: JSON.stringify({ ...JSON.parse(labJson), levels: [{ title: 'Beginner', from: 'Basics' }, { title: 'Next', from: 'More' }] }),
      files: { 'datasets/tiny.sql': 'CREATE TABLE t (n int);', 'lessons/01-basics/01-a.md': file('a', 'Basics', 1) },
    });
    expect(lab.levels).toEqual([{ title: 'Beginner', from: 'Basics' }, { title: 'Next', from: 'More' }]);
    expect(lab.errors).toEqual([]);
  });

  it('reports and drops a level whose "from" is not a chapter', () => {
    const lab = buildLab({
      labJson: JSON.stringify({ ...JSON.parse(labJson), levels: [{ title: 'Beginner', from: 'Basics' }, { title: 'Oops', from: 'Basicz' }] }),
      files: { 'datasets/tiny.sql': 'CREATE TABLE t (n int);', 'lessons/01-basics/01-a.md': file('a', 'Basics', 1) },
    });
    expect(lab.levels).toEqual([{ title: 'Beginner', from: 'Basics' }]);
    expect(lab.errors).toEqual([{ path: 'lab.json', message: 'levels: "Basicz" is not a chapter' }]);
  });

  it('leaves levels undefined when lab.json has none', () => {
    const lab = buildLab({ labJson, files: { 'datasets/tiny.sql': 'CREATE TABLE t (n int);', 'lessons/01-basics/01-a.md': file('a', 'Basics', 1) } });
    expect(lab.levels).toBeUndefined();
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run packages/content-loader/src/buildLab.test.ts`
Expected: FAIL — `lab.levels` is undefined in the first test; the error list is empty in the second.

- [ ] **Step 3: Add the schema field**

In `packages/content-loader/src/schema.ts`, inside `labJson = z.object({ … })`, after `problemsSubtitle: z.string().optional(),` add:

```ts
  levels: z.array(z.object({ title: z.string().min(1), from: z.string().min(1) })).optional(),
```

- [ ] **Step 4: Add the type**

In `packages/core/src/types.ts`, directly above `export interface Lab {` add:

```ts
/** A named band of chapters ("Beginner", …) that starts at chapter `from` and runs until the next level. */
export interface LabLevel {
  title: string;
  from: string;
}
```

and inside `Lab`, after `problemsSubtitle?: string;` add:

```ts
  levels?: LabLevel[];
```

(`packages/core/src/index.ts` already re-exports `./types`; check with `grep -n types packages/core/src/index.ts`.)

- [ ] **Step 5: Validate and pass through in buildLab**

In `packages/content-loader/src/buildLab.ts`, immediately before the `const group = (kind: ItemKind, titles: string[]): Chapter[] =>` line, add:

```ts
  // Levels are checked against lab.json's chapter list (not the built chapters, which drop empty ones).
  const levels = meta.levels?.filter((l) => {
    if (meta.chapters.includes(l.from)) return true;
    errors.push({ path: 'lab.json', message: `levels: "${l.from}" is not a chapter` });
    return false;
  });
```

and in the returned object, after `problemsSubtitle: meta.problemsSubtitle,` add:

```ts
    ...(levels ? { levels } : {}),
```

- [ ] **Step 6: Run the tests and typecheck**

Run: `npx vitest run packages/content-loader && npm run typecheck`
Expected: PASS; typecheck clean.

- [ ] **Step 7: Snapshot (no commit).**

---

### Task 2: Level headings in the sidebar

**Files:**
- Modify: `apps/web/src/lab/navigation.ts` (append helpers)
- Modify: `apps/web/src/components/Sidebar.tsx`
- Test: `apps/web/src/lab/navigation.test.ts` (append), `apps/web/src/components/Sidebar.test.tsx` (append)

**Interfaces:**
- Consumes: `Lab.levels?: LabLevel[]` (Task 1).
- Produces (in `apps/web/src/lab/navigation.ts`): `export interface LevelStart { title: string; index: number; chapter: string }` and `export function levelStarts(lab: Lab): LevelStart[]` — levels whose `from` chapter has at least one lesson, in order, `index` 0-based within that filtered list.

- [ ] **Step 1: Write the failing tests**

Append to `apps/web/src/lab/navigation.test.ts` (merge `levelStarts` into its existing import from `./navigation`):

```ts
describe('levelStarts', () => {
  const item = (id: string, chapter: string) => ({ kind: 'lesson', id, title: id, chapter, order: 1, check: 'rows-unordered', body: '', task: '', hints: [], solution: '', path: '' });
  const lab = {
    id: 'pg', title: 'PG', subtitle: '', language: 'sql', datasets: {}, errors: [], problems: [],
    lessons: [{ title: 'One', items: [item('a', 'One')] }, { title: 'Two', items: [item('b', 'Two')] }],
  } as unknown as Lab;

  it('returns each level that starts at a chapter with lessons, indexed in order', () => {
    expect(levelStarts({ ...lab, levels: [{ title: 'Beginner', from: 'One' }, { title: 'Advanced', from: 'Two' }] })).toEqual([
      { title: 'Beginner', index: 0, chapter: 'One' },
      { title: 'Advanced', index: 1, chapter: 'Two' },
    ]);
  });

  it('skips a level whose chapter has no lessons and returns [] without levels', () => {
    expect(levelStarts({ ...lab, levels: [{ title: 'Ghost', from: 'Empty' }, { title: 'Beginner', from: 'One' }] })).toEqual([{ title: 'Beginner', index: 0, chapter: 'One' }]);
    expect(levelStarts(lab)).toEqual([]);
  });
});
```

(If `navigation.test.ts` does not yet import `Lab`, add `import type { Lab } from '@codeadda/core';`.)

Append inside `describe('Sidebar', …)` in `apps/web/src/components/Sidebar.test.tsx`:

```tsx
  it('shows a level heading above the first chapter of each level, lessons tab only', () => {
    const leveled = { ...lab, levels: [{ title: 'Beginner', from: 'Basics' }, { title: 'Intermediate', from: 'Joins' }] };
    const { unmount } = render(
      <MemoryRouter>
        <Sidebar lab={leveled} tab="lessons" activeId="b" collapsed={false} drawerOpen={false} onCloseDrawer={() => {}} isComplete={() => false} />
      </MemoryRouter>,
    );
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual(['Beginner', 'Intermediate']);
    const order = Array.from(document.querySelectorAll('h3, button[aria-expanded]')).map((e) => e.textContent?.trim());
    expect(order).toEqual(['Beginner', 'Basics', 'Intermediate', 'Joins']);
    unmount();
    render(
      <MemoryRouter>
        <Sidebar lab={leveled} tab="problems" activeId="b" collapsed={false} drawerOpen={false} onCloseDrawer={() => {}} isComplete={() => false} />
      </MemoryRouter>,
    );
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
  });

  it('shows no level headings for a lab without levels', () => {
    renderSidebar('b');
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run apps/web/src/lab/navigation.test.ts apps/web/src/components/Sidebar.test.tsx`
Expected: FAIL — `levelStarts` is not exported; no level-3 headings render.

- [ ] **Step 3: Add the helper**

Append to `apps/web/src/lab/navigation.ts` (keep its existing imports; add `Lab` to the type import from `@codeadda/core` if missing):

```ts
export interface LevelStart {
  title: string;
  /** 0-based position among the levels that are shown. */
  index: number;
  chapter: string;
}

/** Levels whose starting chapter has lessons, in lab order. Labs without levels return []. */
export function levelStarts(lab: Lab): LevelStart[] {
  const chapters = new Set(lab.lessons.map((c) => c.title));
  return (lab.levels ?? []).filter((l) => chapters.has(l.from)).map((l, index) => ({ title: l.title, index, chapter: l.from }));
}
```

- [ ] **Step 4: Render the headings in the sidebar**

In `apps/web/src/components/Sidebar.tsx`:
- Change the navigation import to `import { chaptersFor, itemPath, levelStarts, type Tab } from '../lab/navigation';`.
- Add `import { Fragment, useState } from 'react';` in place of the existing `useState` import (keep any other names it already imports).
- Above `export function Sidebar`, add:

```tsx
// Level 1/2/3 dots: green, amber, red; any further level uses the brand colour.
const LEVEL_DOT = ['bg-ok', 'bg-warn', 'bg-bad'];
```

- Inside `Sidebar`, after `const chapters = chaptersFor(lab, tab);` add:

```tsx
  const levelAt = new Map(tab === 'lessons' ? levelStarts(lab).map((l) => [l.chapter, l]) : []);
```

- In `chapters.map((ch) => { … })`, replace `return (` + `<section key={ch.title}>` … `</section>` + `);` with a fragment that puts the heading first:

```tsx
              const level = levelAt.get(ch.title);
              return (
                <Fragment key={ch.title}>
                  {level && (
                    <h3 className="flex items-center gap-2 px-4 pt-5 pb-0.5 text-xs font-semibold tracking-wider text-muted uppercase">
                      <span aria-hidden="true" className={cx('size-2 rounded-full', LEVEL_DOT[level.index] ?? 'bg-brand')} />
                      {level.title}
                    </h3>
                  )}
                  <section>
                    {/* …the existing <button> and {isOpen && <ul>…</ul>} unchanged… */}
                  </section>
                </Fragment>
              );
```

(Move `key` from `<section>` to `<Fragment>`; keep everything inside `<section>` exactly as it is today.)

- [ ] **Step 5: Run the tests and typecheck**

Run: `npx vitest run apps/web/src/lab/navigation.test.ts apps/web/src/components/Sidebar.test.tsx && npm run typecheck`
Expected: PASS (existing Sidebar tests included); typecheck clean.

- [ ] **Step 6: Snapshot (no commit).**

---

### Task 3: "Skip to Intermediate" banner

**Files:**
- Modify: `apps/web/src/lab/navigation.ts` (append `skipTarget`)
- Modify: `apps/web/src/lab/LessonFlow.tsx`
- Test: `apps/web/src/lab/navigation.test.ts` (append), `apps/web/src/lab/LessonFlow.test.tsx` (append)

**Interfaces:**
- Consumes: `levelStarts(lab)` (Task 2), `itemPath(labId, tab, itemId)`.
- Produces: `export function skipTarget(lab: Lab): { level: string; path: string } | undefined` — the second shown level's title and the path of its first lesson; `undefined` with fewer than two shown levels.

- [ ] **Step 1: Write the failing tests**

Append to `apps/web/src/lab/navigation.test.ts` (merge `skipTarget` into the import):

```ts
describe('skipTarget', () => {
  const item = (id: string, chapter: string) => ({ kind: 'lesson', id, title: id, chapter, order: 1, check: 'rows-unordered', body: '', task: '', hints: [], solution: '', path: '' });
  const lab = {
    id: 'pg', title: 'PG', subtitle: '', language: 'sql', datasets: {}, errors: [], problems: [],
    lessons: [{ title: 'One', items: [item('a', 'One')] }, { title: 'Two', items: [item('b', 'Two'), item('c', 'Two')] }],
  } as unknown as Lab;

  it('points at the first lesson of the second level', () => {
    expect(skipTarget({ ...lab, levels: [{ title: 'Beginner', from: 'One' }, { title: 'Intermediate', from: 'Two' }] })).toEqual({ level: 'Intermediate', path: '/pg/lessons/b' });
  });

  it('is undefined with fewer than two levels', () => {
    expect(skipTarget({ ...lab, levels: [{ title: 'Beginner', from: 'One' }] })).toBeUndefined();
    expect(skipTarget(lab)).toBeUndefined();
  });
});
```

Append to `apps/web/src/lab/LessonFlow.test.tsx` (add `import { MemoryRouter } from 'react-router';` to its imports):

```tsx
describe('LessonFlow skip banner', () => {
  const first: LessonItem = { ...base, id: 'first', chapter: 'Basics' };
  const later: LessonItem = { ...base, id: 'later', chapter: 'Joins' };
  const leveled = {
    ...lab, id: 'pg', title: 'PostgreSQL Lab',
    lessons: [{ title: 'Basics', items: [first] }, { title: 'Joins', items: [later] }],
    levels: [{ title: 'Beginner', from: 'Basics' }, { title: 'Intermediate', from: 'Joins' }],
  } as unknown as Lab;
  const renderFlow = (l: Lab, item: LessonItem) =>
    render(<MemoryRouter><LessonFlow lab={l} tab="lessons" item={item} number={1} engine={engine} /></MemoryRouter>);

  it('shows on the first lesson and links to the first lesson of level 2', () => {
    renderFlow(leveled, first);
    expect(screen.getByText(/Already know SQL\?/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to Intermediate →' })).toHaveAttribute('href', '/pg/lessons/later');
  });

  it('is absent on later lessons and in labs without levels', () => {
    const { unmount } = renderFlow(leveled, later);
    expect(screen.queryByText(/Already know SQL\?/)).toBeNull();
    unmount();
    renderFlow({ ...leveled, levels: undefined } as Lab, first);
    expect(screen.queryByText(/Already know SQL\?/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run apps/web/src/lab/navigation.test.ts apps/web/src/lab/LessonFlow.test.tsx`
Expected: FAIL — `skipTarget` not exported; no banner text.

- [ ] **Step 3: Add the helper**

Append to `apps/web/src/lab/navigation.ts`:

```ts
/** Where "Already know SQL?" sends a learner: the first lesson of the second shown level. */
export function skipTarget(lab: Lab): { level: string; path: string } | undefined {
  const next = levelStarts(lab)[1];
  if (!next) return undefined;
  const first = lab.lessons.find((c) => c.title === next.chapter)?.items[0];
  return first ? { level: next.title, path: itemPath(lab.id, 'lessons', first.id) } : undefined;
}
```

- [ ] **Step 4: Render the banner**

In `apps/web/src/lab/LessonFlow.tsx`:
- Add `import { Link } from 'react-router';`.
- Change `import type { Tab } from './navigation';` to `import { skipTarget, type Tab } from './navigation';`.
- Inside the component, after the `useDraftSaver(…)` line, add:

```tsx
  // Only on a lab's very first lesson, and only for labs with at least two levels.
  const skip = tab === 'lessons' && lab.lessons[0]?.items[0]?.id === item.id ? skipTarget(lab) : undefined;
```

- Right after the closing `</div>` of the `<div className="fs-content"><LessonHeader … /></div>` block, add:

```tsx
      {skip && (
        <p className="fs-content max-w-[760px] rounded-md border border-note-line bg-note-bg px-4 py-2.5 text-sm text-note">
          Already know SQL?{' '}
          <Link to={skip.path} className="font-semibold underline underline-offset-2">
            Skip to {skip.level} →
          </Link>
        </p>
      )}
```

- [ ] **Step 5: Run the tests and typecheck**

Run: `npx vitest run apps/web/src/lab && npm run typecheck`
Expected: PASS (existing LessonFlow tests still render without a router because they have no levels); typecheck clean.

- [ ] **Step 6: Snapshot (no commit).**

---

### Task 4: Header name and multi-lab home helpers

**Files:**
- Modify: `apps/web/src/components/LabHeader.tsx` (`Wordmark`)
- Modify: `apps/web/src/home/homeContent.ts`
- Modify: `apps/web/src/home/HomePage.tsx:58` (pill)
- Test: `apps/web/src/components/LabHeader.test.tsx` (append), `apps/web/src/home/homeContent.test.ts` (append)

**Interfaces:**
- Produces: `export function heroPill(labs: Lab[]): string` in `homeContent.ts`; `LIVE_DESCRIPTIONS.postgres`.

- [ ] **Step 1: Write the failing tests**

Append inside `describe('LabHeader', …)` in `apps/web/src/components/LabHeader.test.tsx`:

```tsx
  it('keeps "SQLab" only for "SQL Lab"; other labs read "<Name> Lab"', () => {
    render(<MemoryRouter><LabHeader lab={{ ...lab, title: 'PostgreSQL Lab' }} tab="lessons" onOpenDrawer={() => {}} /></MemoryRouter>);
    const name = screen.getByText('PostgreSQL');
    expect(name).toHaveClass('text-brand');
    expect(name.parentElement).toHaveTextContent(/^CodeAdda PostgreSQL Lab$/);
  });
```

Append to `apps/web/src/home/homeContent.test.ts` (merge `heroPill` into the import from `./homeContent`):

```ts
describe('heroPill', () => {
  const mk = (id: string, title: string, n: number) =>
    ({ ...lab, id, title, lessons: [{ title: 'A', items: Array.from({ length: n }, (_, i) => item(`${id}${i}`, 'lesson')) }], problems: [] }) as Lab;

  it('reads like today with one lab, counts all labs with two, and says soon with none', () => {
    expect(heroPill([mk('sql', 'SQL Lab', 5)])).toBe('SQL lab now open · 5 exercises');
    expect(heroPill([mk('sql', 'SQL Lab', 5), mk('postgres', 'PostgreSQL Lab', 3)])).toBe('Two labs open · 8 exercises');
    expect(heroPill([])).toBe('Labs opening soon');
  });

  it('has a card description for the PostgreSQL lab', () => {
    expect(LIVE_DESCRIPTIONS.postgres).toBe('From your first table to JSONB, window functions and indexes, all on a food-delivery database.');
  });
});
```

(`lab` and `item` are the fixtures already defined at the top of `homeContent.test.ts`.)

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run apps/web/src/components/LabHeader.test.tsx apps/web/src/home/homeContent.test.ts`
Expected: FAIL — header renders "PostgreSQLab"; `heroPill` not exported; no `postgres` description.

- [ ] **Step 3: Fix the header merge**

In `apps/web/src/components/LabHeader.tsx`, change the doc comment and the `merged` line to:

```tsx
/** "SQL Lab" → "CodeAdda " + orange "SQL" + "ab" (reads as "SQLab"); any other title → "CodeAdda " + orange first word + rest. */
```

```tsx
  const merged = head === 'SQL' && tail === 'Lab';
```

- [ ] **Step 4: Add the home helpers**

In `apps/web/src/home/homeContent.ts`:
- Add `postgres` to `LIVE_DESCRIPTIONS`:

```ts
export const LIVE_DESCRIPTIONS: Record<string, string> = {
  sql: 'From your first SELECT to joins, CTEs and window functions, all on one realistic shop database.',
  postgres: 'From your first table to JSONB, window functions and indexes, all on a food-delivery database.',
};
```

- After `labsLead`, add:

```ts
/** Hero pill: unchanged wording with one lab, a count of labs and exercises with more. */
export function heroPill(labs: Lab[]): string {
  if (labs.length === 0) return 'Labs opening soon';
  const total = labs.reduce((n, l) => n + labStats(l).total, 0);
  if (labs.length === 1) return `${labs[0]!.title.replace(/\s+Lab$/, '')} lab now open · ${total} exercises`;
  return `${word(labs.length)} labs open · ${total} exercises`;
}
```

- In `apps/web/src/home/HomePage.tsx`, add `heroPill` to the import from `./homeContent`, and replace `{stats ? \`SQL lab now open · ${stats.total} exercises\` : 'Labs opening soon'}` with `{heroPill(labs)}`. (`labs` is already imported from the registry in this file; check with `grep -n "labs" apps/web/src/home/HomePage.tsx | head -3`.)

- [ ] **Step 5: Run the tests and typecheck**

Run: `npx vitest run apps/web/src/components apps/web/src/home && npm run typecheck`
Expected: PASS — including the existing HomePage test that expects `SQL lab now open · ${stats.total} exercises` (one lab today); typecheck clean.

- [ ] **Step 6: Snapshot (no commit).**

---

### Task 5: The `food` dataset, `lab.json`, and tests that now see two labs

**Files:**
- Create: `content/postgres/lab.json`
- Create: `content/postgres/datasets/food.sql`
- Create: `scripts/foodDataset.test.ts`
- Modify: `apps/web/src/content/registry.test.ts` (tripwire)
- Modify: `apps/web/src/home/HomePage.test.tsx` (lines 12, 31, 39–41)
- Modify: `e2e/lab.spec.ts` (home region name, ~line 241)

**Interfaces:**
- Produces: dataset name `food` with tables `customers`, `restaurants`, `menu_items`, `riders`, `orders`, `order_items`, `reviews` (columns below) for every Intermediate/Advanced lesson.

- [ ] **Step 1: Write the failing dataset test**

Create `scripts/foodDataset.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { PgliteEngine } from '@codeadda/engine-pglite';

const source = readFileSync(resolve(import.meta.dirname, '../content/postgres/datasets/food.sql'), 'utf8');

describe('food dataset', () => {
  const engine = new PgliteEngine();
  afterAll(() => engine.dispose());

  const rows = async (sql: string) => {
    const r = await engine.run(sql);
    if (!r.ok) throw new Error(r.error.message);
    return r.rows;
  };

  it('loads with the planned row counts and lesson-ready quirks', async () => {
    await engine.setup({ name: 'food', source });
    const counts = await rows(`SELECT
      (SELECT count(*) FROM customers), (SELECT count(*) FROM restaurants), (SELECT count(*) FROM menu_items),
      (SELECT count(*) FROM riders), (SELECT count(*) FROM orders), (SELECT count(*) FROM order_items), (SELECT count(*) FROM reviews)`);
    expect(counts[0]!.map(Number)).toEqual([15, 8, 30, 5, 40, 80, 20]);

    const gaps = await rows(`SELECT count(*) FROM generate_series('2026-03-02'::date, '2026-03-22'::date, '1 day') d
      WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.placed_at::date = d::date)`);
    expect(Number(gaps[0]![0])).toBeGreaterThanOrEqual(2);

    const range = await rows(`SELECT min(placed_at)::date::text, max(placed_at)::date::text FROM orders`);
    expect(range[0]).toEqual(['2026-03-02', '2026-03-22']);

    expect(Number((await rows(`SELECT count(*) FROM orders WHERE status = 'cancelled'`))[0]![0])).toBeGreaterThanOrEqual(1);
    expect(Number((await rows(`SELECT count(*) FROM orders WHERE rider_id IS NULL`))[0]![0])).toBeGreaterThanOrEqual(1);
    expect(Number((await rows(`SELECT count(*) FROM reviews WHERE to_tsvector('english', body) @@ to_tsquery('english', 'spicy')`))[0]![0])).toBeGreaterThanOrEqual(1);
    expect(Number((await rows(`SELECT count(*) FROM menu_items WHERE tags @> '{veg,spicy}'`))[0]![0])).toBeGreaterThanOrEqual(1);
    expect(Number((await rows(`SELECT count(*) FROM orders WHERE details->'payment'->>'method' = 'upi'`))[0]![0])).toBeGreaterThanOrEqual(1);
    expect(Number((await rows(`SELECT count(*) FROM restaurants WHERE opening_hours->'sun' IS NULL`))[0]![0])).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run scripts/foodDataset.test.ts`
Expected: FAIL — `ENOENT … food.sql`.

- [ ] **Step 3: Write `content/postgres/lab.json`**

```json
{
  "id": "postgres",
  "title": "PostgreSQL Lab",
  "subtitle": "From your first table to JSONB and window functions",
  "sidebarTitle": "The Postgres Path",
  "sidebarSubtitle": "Beginner to advanced, one query at a time",
  "problemsSubtitle": "Practice problems on the food-delivery database",
  "language": "sql",
  "chapters": [
    "Meet Postgres", "Data types", "Creating tables", "Adding and reading data", "Changing data", "Constraints",
    "Joins and relationships", "Aggregation", "Views", "RETURNING and UPSERT", "Identity and sequences", "Dates and generate_series",
    "Arrays", "JSONB", "Window functions", "Indexes and EXPLAIN", "Transactions", "Full-text search"
  ],
  "problemGroups": ["Warm-up", "Everyday Postgres", "Power features"],
  "levels": [
    { "title": "Beginner", "from": "Meet Postgres" },
    { "title": "Intermediate", "from": "Joins and relationships" },
    { "title": "Advanced", "from": "Arrays" }
  ]
}
```

- [ ] **Step 4: Write `content/postgres/datasets/food.sql`**

Use exactly this schema, then the rows described after it. Follow `content/sql/datasets/shop.sql` for style (one `INSERT … VALUES` per table, columns listed explicitly, ids never written — identity assigns 1…n in insert order, so foreign keys refer to insert positions).

```sql
CREATE TABLE customers (
  id        integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name      text NOT NULL,
  email     text NOT NULL UNIQUE,
  city      text NOT NULL,
  joined_on date NOT NULL
);
COMMENT ON TABLE customers IS 'People who order food through the app';

CREATE TABLE restaurants (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          text NOT NULL,
  city          text NOT NULL,
  cuisine       text NOT NULL,
  tags          text[] NOT NULL DEFAULT '{}',
  opening_hours jsonb NOT NULL,
  rating        numeric(2,1) CHECK (rating BETWEEN 0 AND 5)
);
COMMENT ON TABLE restaurants IS 'Restaurants listed in the app; opening_hours maps day keys (mon…sun) to {"open","close"}';

CREATE TABLE menu_items (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  restaurant_id integer NOT NULL REFERENCES restaurants(id),
  name          text NOT NULL,
  price         numeric(8,2) NOT NULL CHECK (price > 0),
  tags          text[] NOT NULL DEFAULT '{}',
  available     boolean NOT NULL DEFAULT true
);
COMMENT ON TABLE menu_items IS 'Dishes each restaurant sells; tags like veg, spicy, bestseller';

CREATE TABLE riders (
  id        integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name      text NOT NULL,
  vehicle   text NOT NULL,
  joined_on date NOT NULL
);
COMMENT ON TABLE riders IS 'Delivery riders';

CREATE TABLE orders (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id   integer NOT NULL REFERENCES customers(id),
  restaurant_id integer NOT NULL REFERENCES restaurants(id),
  rider_id      integer REFERENCES riders(id),
  status        text NOT NULL CHECK (status IN ('placed', 'delivered', 'cancelled')),
  placed_at     timestamp NOT NULL,
  total         numeric(8,2) NOT NULL CHECK (total >= 0),
  details       jsonb NOT NULL
);
COMMENT ON TABLE orders IS 'One row per order; details holds address, payment and notes as JSONB';

CREATE TABLE order_items (
  order_id     integer NOT NULL REFERENCES orders(id),
  menu_item_id integer NOT NULL REFERENCES menu_items(id),
  quantity     integer NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (order_id, menu_item_id)
);
COMMENT ON TABLE order_items IS 'Which dishes are in each order (many-to-many)';

CREATE TABLE reviews (
  id       integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id integer NOT NULL UNIQUE REFERENCES orders(id),
  rating   integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body     text NOT NULL
);
COMMENT ON TABLE reviews IS 'At most one review per order';
```

Rows (all original, made-up; friendly international mix of names as in `shop.sql`):
- `customers`: exactly 15; cities from a small set (e.g. Mumbai, Pune, Bengaluru, Delhi) with at least 3 customers in one city; `joined_on` in 2025.
- `restaurants`: exactly 8; varied cuisines; `tags` such as `{veg-friendly,late-night}`; `opening_hours` like `{"mon": {"open": "11:00", "close": "23:00"}, …}`; at least one restaurant has no `"sun"` key (closed Sundays); `rating` values 3.8–4.9 with no ties at the top.
- `menu_items`: exactly 30 across the 8 restaurants; prices 60.00–650.00; `tags` drawn from `veg`, `non-veg`, `spicy`, `bestseller`, `new`; at least two items tagged both `veg` and `spicy`; at least two with `available = false`.
- `riders`: exactly 5; vehicles `bike`, `scooter`, `cycle`.
- `orders`: exactly 40, `placed_at` between `2026-03-02 09:00` and `2026-03-22 23:00` (first order on 2026-03-02, last on 2026-03-22), with **no orders on 2026-03-09 and 2026-03-16**; at least 4 `cancelled` (rider NULL) and at least 2 `placed` (rider NULL); the rest `delivered` with a rider; `total` equals the sum of its `order_items` (`quantity × price`), written as a literal; `details` like `{"address": {"area": "Bandra", "pincode": "400050"}, "payment": {"method": "upi"}, "notes": "Ring the bell"}` with methods `upi`, `card`, `cash` (at least one of each); some orders have no `"notes"` key.
- `order_items`: exactly 80 rows over the 40 orders (1–4 dishes each), every dish belonging to the order's restaurant.
- `reviews`: exactly 20, one per delivered order at most; bodies are 1–2 sentences using words such as "spicy", "late", "cold", "fresh", "crispy", "generous" (at least two reviews contain "spicy").

- [ ] **Step 5: Run the dataset test**

Run: `npx vitest run scripts/foodDataset.test.ts`
Expected: PASS. If a total doesn't match its items, fix the literal (an optional extra check you can run once in a scratch query: `SELECT o.id FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN menu_items m ON m.id = oi.menu_item_id GROUP BY o.id HAVING o.total <> sum(oi.quantity * m.price)` returns no rows).

- [ ] **Step 6: Update the tests that now see two labs**

- `apps/web/src/content/registry.test.ts`, the tripwire test: rename to `'defaults to the real registry, where SQL and PostgreSQL are live'` and expect `['MongoDB', 'Redis']`.
- `apps/web/src/home/HomePage.test.tsx`:
  - line 12: region name becomes `'Two labs are open. Two more are cooking.'`
  - line 31: `expect(screen.getByText(heroPill(labs))).toBeInTheDocument();` (import `heroPill` from `./homeContent` and `labs` from `../content/registry`)
  - lines 39–41: replace `UPCOMING_LABS` with `upcomingLabs()` (import it from `../content/registry`) and the first count with `labs.length + upcomingLabs().length`
- `e2e/lab.spec.ts`: the home test's region name becomes `'Two labs are open. Two more are cooking.'` (the `toHaveCount(4)` and MongoDB-not-a-link lines stay).

- [ ] **Step 7: Run everything touched**

Run: `npm run typecheck && npx vitest run apps/web/src/content apps/web/src/home scripts/foodDataset.test.ts && npm run check-content`
Expected: all PASS; check-content prints `✓ sql: 70 item(s) checked, 0 problem(s)` and `✓ postgres: 0 item(s) checked, 0 problem(s)`.

- [ ] **Step 8: Snapshot (no commit).**

---

### Tasks 6–11: Lessons

Every lesson task follows the same recipe. **Template:** read `content/sql/lessons/05-grouping/03-avg.md` (plain lesson), `content/sql/lessons/08-modifying/01-insert-row.md` (`check: state` + `## Watch it happen`) and `content/sql/lessons/03-filtering/01-where.md` (animation YAML) before writing. Front-matter: `id`, `title`, `chapter` (exact `lab.json` title), `order`, then either `dataset: food` **or** a `## Setup` SQL section, then `check` (and `checkQuery` for `state`/`custom`). Sections in order: explanation paragraph(s) → optional `## Watch it happen` (✦ lessons only; YAML with `tables` and 3–5 `steps`, each `label` + `caption`, optional `show`, `highlight` (tones `focus|kept|removed`), `notes`) → `## Context` (one more idea + one runnable example, using **different** data from the task) → `## Task` → `## Hint` (bullets, never the full answer) → `## Solution` (one ```sql block).

**Beginner lessons (Tasks 6–7)** use `## Setup` (no `dataset`). A lesson that needs an empty database uses this exact setup: `CREATE TABLE _start (n int); DROP TABLE _start;`. Structure-changing lessons use `check: state` with a `checkQuery` that reads normalised facts, e.g. `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'menu' ORDER BY column_name` — never raw DDL, never `ordinal_position`.

**Intermediate/Advanced lessons (Tasks 8–11)** use `dataset: food`.

**Per-task recipe (same for 6–11):**
- [ ] Write the lessons listed in the task's table, file path `content/postgres/lessons/<chapter-dir>/<NN>-<id>.md`.
- [ ] Run `npm run check-content` — expected `✓ postgres: <cumulative count> item(s) checked, 0 problem(s)` (counts: after Task 6 → 8, 7 → 16, 8 → 24, 9 → 32, 10 → 40, 11 → 46).
- [ ] Run every `## Context` example once in a scratch script against the same setup/dataset (e.g. a throwaway `node`/`tsx` script using `PgliteEngine`, not saved) and confirm it returns at least one row (or succeeds, for DDL examples).
- [ ] Re-read every `## Hint`: it must not contain the solution's full clause.
- [ ] Snapshot (no commit).

#### Task 6: Beginner, chapters 1–3 (8 lessons)

| # | Dir / id | Title | Data | Check | Task asks for |
|---|---|---|---|---|---|
| 1 | `01-meet-postgres/01-first-query` | Your first query | empty setup | rows-unordered | `SELECT 'Hello, Postgres!' AS greeting` |
| 2 | `01-meet-postgres/02-calculator` | Postgres as a calculator | empty setup | rows-unordered | `7 * 6 AS answer`, `round(10 / 3.0, 2) AS third`, `upper('adda') AS shout` (explanation may show `now()`, the task must not use it) |
| 3 | `02-data-types/01-numbers` | Numbers: integer and numeric | empty setup | rows-unordered | `10 / 4 AS whole`, `10 / 4.0 AS exact`, `19.999::numeric(6,2) AS price` |
| 4 | `02-data-types/02-text-casting` | Text and casting | setup: `prices(item text, price_text text)` 4 rows | rows-unordered | `item` and `price_text::numeric * 2 AS doubled` |
| 5 | `02-data-types/03-dates-booleans` | Dates, times and booleans | setup: `deliveries(id int, ordered_at timestamp, delivered boolean)` 5 rows in March 2026 | rows-unordered | id and `ordered_at::date AS day` for delivered rows |
| 6 | `03-creating-tables/01-create-table` | CREATE TABLE | empty setup | state: columns of `menu` | create `menu(id integer, name text, price numeric(6,2))` |
| 7 | `03-creating-tables/02-alter-table` | Changing a table | setup: `menu` as above | state: columns of `menu` | add `is_veg boolean` |
| 8 | `03-creating-tables/03-drop-table` | Removing a table | setup: `menu` + `old_menu` | state: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1` | drop `old_menu` |

#### Task 7: Beginner, chapters 4–6 (8 lessons, 2 animated)

| # | Dir / id | Title | Data | Check | Task asks for |
|---|---|---|---|---|---|
| 9 | `04-adding-reading/01-insert` | INSERT | setup: `menu(id integer, name text, price numeric(6,2), is_veg boolean)` with 2 rows | state: `SELECT * FROM menu ORDER BY id` | insert one given dish |
| 10 | `04-adding-reading/02-where` | Filtering with WHERE | setup: `menu` with 8 rows | rows-unordered | veg dishes under 200 |
| 11 | `04-adding-reading/03-order-limit` | Sorting and limiting | same | rows-ordered | the 3 most expensive dishes, highest first (no ties in data) |
| 12 | `05-changing-data/01-update` | UPDATE | same | state: `SELECT * FROM menu ORDER BY id` | raise one dish's price |
| 13 | `05-changing-data/02-delete` | DELETE | setup adds `available boolean` | state: `SELECT * FROM menu ORDER BY id` | delete unavailable dishes |
| 14 | `06-constraints/01-not-null-default` | NOT NULL and DEFAULT | empty setup | state: `SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'dishes' ORDER BY column_name` | create `dishes` with `name text NOT NULL`, `available boolean DEFAULT true` (and `id integer`) |
| 15 ✦ | `06-constraints/02-unique-check` | UNIQUE and CHECK | setup: `menu` with rows, no constraints | state: `SELECT constraint_type, count(*) FROM information_schema.table_constraints WHERE table_name = 'menu' AND constraint_type IN ('UNIQUE','CHECK') GROUP BY 1 ORDER BY 1` (exclude NOT NULL checks by giving the table no NOT NULL columns) | `UNIQUE (name)` and `CHECK (price > 0)`; animation shows a bad row being rejected |
| 16 ✦ | `06-constraints/03-keys` | Primary and foreign keys | setup: `restaurants(id integer, name text)`, `dishes(id integer, restaurant_id integer, name text)` with rows, no keys | state: `SELECT tc.table_name, tc.constraint_type, kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu USING (constraint_name, table_name) WHERE tc.constraint_type IN ('PRIMARY KEY','FOREIGN KEY') ORDER BY 1, 2, 3` | primary keys on both `id`s, foreign key `dishes.restaurant_id → restaurants.id`; animation shows an orphan insert rejected |

#### Task 8: Intermediate, chapters 7–9 (8 lessons, 2 animated) — `dataset: food`

| # | Dir / id | Title | Check | Task asks for |
|---|---|---|---|---|
| 17 | `07-joins/01-inner-join` | Inner join | rows-unordered | each order id with its restaurant name |
| 18 | `07-joins/02-left-join` | Left join | rows-unordered | every order id with rider name, NULL when no rider |
| 19 ✦ | `07-joins/03-many-to-many` | Many-to-many through a join table | rows-unordered | dishes in one given order (order → order_items → menu_items) |
| 20 | `08-aggregation/01-aggregates` | COUNT, SUM and AVG | rows-unordered | delivered orders' count, sum and rounded average total |
| 21 | `08-aggregation/02-group-by-having` | GROUP BY and HAVING | rows-unordered | restaurants with at least 5 orders and their counts |
| 22 ✦ | `08-aggregation/03-filter` | Conditional totals with FILTER | rows-unordered | per restaurant: delivered count and cancelled count using `FILTER (WHERE …)` |
| 23 | `09-views/01-create-view` | CREATE VIEW | state: `SELECT * FROM restaurant_orders ORDER BY 1` | view `restaurant_orders(name, orders)` |
| 24 | `09-views/02-materialized-views` | Materialized views and REFRESH | state: `SELECT * FROM daily_orders ORDER BY 1` | create materialized view `daily_orders(day, orders)`, insert one given order, then `REFRESH MATERIALIZED VIEW` |

#### Task 9: Intermediate, chapters 10–12 (8 lessons, 3 animated) — `dataset: food`

| # | Dir / id | Title | Check | Task asks for |
|---|---|---|---|---|
| 25 ✦ | `10-returning-upsert/01-insert-returning` | INSERT … RETURNING | rows-unordered | insert one given rider and return its `id, name` |
| 26 | `10-returning-upsert/02-update-delete-returning` | UPDATE and DELETE … RETURNING | rows-unordered | mark unavailable dishes of one restaurant available again, returning `id, name` |
| 27 ✦ | `10-returning-upsert/03-on-conflict` | ON CONFLICT | state: `SELECT name, email, city FROM customers ORDER BY email` | insert two customers where one email already exists; `ON CONFLICT (email) DO UPDATE SET city = EXCLUDED.city` |
| 28 | `11-identity-sequences/01-identity-vs-serial` | Identity columns vs SERIAL | state: `SELECT column_name, is_identity FROM information_schema.columns WHERE table_name = 'coupons' ORDER BY column_name` | create `coupons(id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, code text)` |
| 29 | `11-identity-sequences/02-sequences` | Working with sequences | rows-unordered | create sequence `ticket_no START 100`, return `nextval` twice in one query as `first, second` |
| 30 | `12-dates-series/01-date-trunc` | date_trunc and intervals | rows-unordered | orders per week (`date_trunc('week', placed_at)`) |
| 31 | `12-dates-series/02-generate-series` | generate_series | rows-ordered | every date from 2026-03-02 to 2026-03-08 as `day` |
| 32 ✦ | `12-dates-series/03-fill-gaps` | Filling gaps in daily totals | rows-ordered | orders per day for 2026-03-02 … 2026-03-22 with 0 on empty days (series LEFT JOIN orders) |

#### Task 10: Advanced, chapters 13–15 (8 lessons, 4 animated) — `dataset: food`

| # | Dir / id | Title | Check | Task asks for |
|---|---|---|---|---|
| 33 | `13-arrays/01-array-any` | Array columns and ANY | rows-unordered | dishes tagged `bestseller` (`'bestseller' = ANY(tags)`) |
| 34 ✦ | `13-arrays/02-contains-unnest` | Containment and unnest | rows-unordered | each tag with how many dishes carry it (`unnest(tags)` + `GROUP BY`) |
| 35 ✦ | `14-jsonb/01-reading-values` | Reading JSONB values | rows-unordered | order id and payment method (`details->'payment'->>'method'`) |
| 36 | `14-jsonb/02-searching` | Searching JSONB | rows-unordered | orders paid by card using `@>`, and the explanation contrasts `?` for key existence |
| 37 | `14-jsonb/03-building-updating` | Building and updating JSONB | state: `SELECT id, details FROM orders WHERE id = <given id>` | add a `"notes"` key with `jsonb_set` (or `||`) to one given order |
| 38 | `15-window-functions/01-row-number-rank` | ROW_NUMBER and RANK | rows-unordered | each dish with its price rank within its restaurant |
| 39 ✦ | `15-window-functions/02-running-totals` | Running totals | rows-ordered | each delivered order in time order with a running total of `total` |
| 40 | `15-window-functions/03-lag-lead` | LAG and LEAD | rows-ordered | each order of one given customer with the previous order's date |

#### Task 11: Advanced, chapters 16–18 (6 lessons, 2 animated) — `dataset: food`

| # | Dir / id | Title | Check | Task asks for |
|---|---|---|---|---|
| 41 ✦ | `16-indexes/01-btree-explain` | B-tree indexes and EXPLAIN | custom: `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'orders' AND indexdef ILIKE '%(placed_at)%')` | create an index on `orders(placed_at)`; the explanation shows reading `EXPLAIN` output without grading it |
| 42 | `16-indexes/02-gin-index` | GIN indexes for JSONB and arrays | custom: `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'menu_items' AND indexdef ILIKE '%gin%tags%')` | create a GIN index on `menu_items(tags)` |
| 43 ✦ | `17-transactions/01-begin-commit-rollback` | BEGIN, COMMIT and ROLLBACK | state: `SELECT status, count(*) FROM orders GROUP BY 1 ORDER BY 1` | in one transaction mark one given placed order delivered and COMMIT; then in a second transaction cancel every placed order and ROLLBACK (final state differs from the start, so doing nothing fails) |
| 44 | `17-transactions/02-savepoints` | Savepoints | state: `SELECT name FROM riders ORDER BY name` | BEGIN; insert rider A; SAVEPOINT; insert rider B; ROLLBACK TO the savepoint; COMMIT (only A remains) |
| 45 | `18-full-text-search/01-tsvector-tsquery` | to_tsvector, to_tsquery and @@ | rows-unordered | reviews matching `spicy` |
| 46 | `18-full-text-search/02-ts-rank` | Ranking results with ts_rank | rows-ordered | reviews matching `spicy \| crispy` with `ts_rank` rounded to 3 places, ordered by rank then id |

---

### Task 12: LeetLab problems (12)

**Files:** Create `content/postgres/problems/<group-dir>/<NN>-<id>.md` for each row below.

Template: `content/sql/problems/01-select/01-out-of-stock.md` (front-matter with `difficulty`, a scenario paragraph, `## Tables` with an ASCII schema, `## Task`, `## Example` with Input/Output/Explanation, `## Hint` bullets, `## Setup` creating and filling the problem's own small food-themed tables with `COMMENT ON TABLE … 'Challenge table: …'`, `## Solution`). No `dataset`. Rows-checked solutions return at least one row.

| Group dir | # / id | Title | Difficulty | Skill |
|---|---|---|---|---|
| `01-warm-up` | 01 `veg-under-200` | Veg Under 200 | Easy | `WHERE` with two conditions |
| `01-warm-up` | 02 `top-rated` | Top Rated | Easy | `ORDER BY … LIMIT` |
| `01-warm-up` | 03 `city-regulars` | City Regulars | Easy | `GROUP BY` city with `HAVING` |
| `01-warm-up` | 04 `cancelled-share` | Cancelled Share | Easy | `count(*) FILTER (WHERE …)` |
| `02-everyday-postgres` | 01 `busiest-day` | Busiest Day | Medium | `date_trunc('day', …)` + aggregate + top 1 |
| `02-everyday-postgres` | 02 `idle-riders` | Idle Riders | Medium | `LEFT JOIN … IS NULL` |
| `02-everyday-postgres` | 03 `price-upsert` | Price Upsert | Medium | `INSERT … ON CONFLICT DO UPDATE … RETURNING` |
| `02-everyday-postgres` | 04 `restaurant-revenue` | Restaurant Revenue | Medium | join + `SUM` + `FILTER` for delivered only |
| `03-power-features` | 01 `spicy-and-veg` | Spicy and Veg | Hard | array `@>` |
| `03-power-features` | 02 `payment-split` | Payment Split | Hard | JSONB `->>` + `GROUP BY` |
| `03-power-features` | 03 `days-between-orders` | Days Between Orders | Hard | `LAG` over `PARTITION BY customer` |
| `03-power-features` | 04 `daily-revenue-report` | Daily Revenue Report | Hard | `generate_series` + `LEFT JOIN` + `COALESCE` |

- [ ] Write the 12 problems.
- [ ] Run `npm run check-content` — expected `✓ postgres: 58 item(s) checked, 0 problem(s)`.
- [ ] Re-read every hint: no full clause from the solution.
- [ ] Snapshot (no commit).

---

### Task 13: Shape test, check-robustness test, e2e and README

**Files:**
- Create: `scripts/postgresLabShape.test.ts`
- Create: `scripts/postgresChecks.test.ts`
- Modify: `e2e/lab.spec.ts` (append a `postgres lab` describe block)
- Modify: `README.md`

**Interfaces:**
- Consumes: `loadLabFromDir` (`@codeadda/content-loader/node`), `PgliteEngine` (`@codeadda/engine-pglite`), `grade`, `resolveDataset` (`@codeadda/core`; `grade(engine, item, dataset, query)` returns `{ pass: boolean; … }` — see `scripts/checkLab.ts`).

- [ ] **Step 1: Write the shape test**

Create `scripts/postgresLabShape.test.ts`:

```ts
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadLabFromDir } from '@codeadda/content-loader/node';

const lab = loadLabFromDir(resolve(import.meta.dirname, '../content/postgres'));
const lessons = lab.lessons.flatMap((c) => c.items);
const problems = lab.problems.flatMap((c) => c.items);

describe('PostgreSQL lab shape', () => {
  it('has no content errors', () => expect(lab.errors).toEqual([]));

  it('has 18 chapters with the planned lesson counts (46 lessons)', () => {
    expect(lab.lessons.map((c) => [c.title, c.items.length])).toEqual([
      ['Meet Postgres', 2], ['Data types', 3], ['Creating tables', 3], ['Adding and reading data', 3], ['Changing data', 2], ['Constraints', 3],
      ['Joins and relationships', 3], ['Aggregation', 3], ['Views', 2], ['RETURNING and UPSERT', 3], ['Identity and sequences', 2], ['Dates and generate_series', 3],
      ['Arrays', 2], ['JSONB', 3], ['Window functions', 3], ['Indexes and EXPLAIN', 2], ['Transactions', 2], ['Full-text search', 2],
    ]);
    expect(lessons).toHaveLength(46);
    expect(lessons[0]!.title).toBe('Your first query');
  });

  it('animates exactly the 12 planned lessons', () => {
    expect(lessons.flatMap((l, i) => (l.steps ? [i + 1] : []))).toEqual([15, 16, 19, 22, 25, 27, 32, 34, 35, 39, 41, 43]);
  });

  it('gives every lesson a Context section', () => {
    expect(lessons.filter((l) => !l.context).map((l) => l.id)).toEqual([]);
  });

  it('has three levels starting at the planned chapters', () => {
    expect(lab.levels).toEqual([
      { title: 'Beginner', from: 'Meet Postgres' },
      { title: 'Intermediate', from: 'Joins and relationships' },
      { title: 'Advanced', from: 'Arrays' },
    ]);
  });

  it('has 12 problems: 4 Easy, 4 Medium, 4 Hard in the three groups, each self-contained', () => {
    expect(lab.problems.map((c) => [c.title, c.items.map((p) => p.difficulty)])).toEqual([
      ['Warm-up', ['Easy', 'Easy', 'Easy', 'Easy']],
      ['Everyday Postgres', ['Medium', 'Medium', 'Medium', 'Medium']],
      ['Power features', ['Hard', 'Hard', 'Hard', 'Hard']],
    ]);
    expect(problems.filter((p) => !p.setup || !p.tables || !p.example || p.dataset).map((p) => p.id)).toEqual([]);
  });
});
```

- [ ] **Step 2: Write the check-robustness test**

Create `scripts/postgresChecks.test.ts`:

```ts
import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { grade, resolveDataset } from '@codeadda/core';
import { loadLabFromDir } from '@codeadda/content-loader/node';
import { PgliteEngine } from '@codeadda/engine-pglite';

const lab = loadLabFromDir(resolve(import.meta.dirname, '../content/postgres'));
const lessons = lab.lessons.flatMap((c) => c.items);
const byId = (id: string) => {
  const l = lessons.find((x) => x.id === id);
  if (!l) throw new Error(`no lesson ${id}`);
  return l;
};

describe('PostgreSQL lab answer checks', () => {
  const engine = new PgliteEngine();
  afterAll(() => engine.dispose());
  const check = (id: string, query: string) => grade(engine, byId(id), resolveDataset(lab, byId(id)), query);

  it('accepts equivalent answers to beginner build lessons', async () => {
    expect((await check('create-table', 'create table menu (price numeric(6,2), name text, id int);')).pass).toBe(true);
    expect((await check('alter-table', 'ALTER TABLE menu   ADD COLUMN is_veg bool;')).pass).toBe(true);
    expect((await check('drop-table', 'DROP TABLE IF EXISTS old_menu;')).pass).toBe(true);
  });

  it('never passes a no-op for any state or custom lesson', async () => {
    const graded = lessons.filter((l) => l.check === 'state' || l.check === 'custom');
    expect(graded.length).toBeGreaterThanOrEqual(15);
    const passed: string[] = [];
    for (const l of graded) if ((await grade(engine, l, resolveDataset(lab, l), 'SELECT 1;')).pass) passed.push(l.id);
    expect(passed).toEqual([]);
  });
});
```

- [ ] **Step 3: Run both**

Run: `npx vitest run scripts/postgresLabShape.test.ts scripts/postgresChecks.test.ts`
Expected: PASS. If an equivalent answer fails, fix that lesson's `checkQuery` to read normalised facts (column names and `data_type`, ordered by name) and re-run `npm run check-content`. If a no-op passes, change that lesson's task so its final state differs from the starting state.

- [ ] **Step 4: Add the e2e tests**

Append to `e2e/lab.spec.ts`:

```ts
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
    const labs = page.getByRole('region', { name: 'Two labs are open. Two more are cooking.' });
    await expect(labs.getByRole('link', { name: /PostgreSQL/ })).toHaveAttribute('href', '/postgres');
    await expect(labs.getByText('Coming soon')).toHaveCount(2);
  });
});
```

(The `inner-join` id and "Inner join" title come from Task 8, lesson 17; `reading-values` from Task 10, lesson 35. If those ids differ, use the actual first Intermediate lesson id and the JSONB reading lesson id.)

- [ ] **Step 5: Update the README**

In `README.md`, replace the opening paragraph's second sentence with:

```markdown
Two labs are live: the **SQL lab** (62 lessons across 11 chapters, plus 8 practice problems) and the
**PostgreSQL lab** (46 lessons from beginner to advanced across 18 chapters, plus 12 practice problems),
both running real PostgreSQL in your browser via PGlite. MongoDB and Redis labs are coming next.
```

and under "Add your own lesson", change `content/sql/lessons/...` mentions to note that each lab lives in its own folder (`content/sql/`, `content/postgres/`) with the same format, and add one line: "A lab's `lab.json` may list `levels` (`{ "title", "from" }`), which group its chapters under headings in the sidebar."

- [ ] **Step 6: Full verification**

Run: `npm run typecheck && npm test && npm run check-content && npm run e2e`
Expected: typecheck clean; all unit tests pass; check-content `✓ sql: 70 …, 0 problem(s)` and `✓ postgres: 58 …, 0 problem(s)`; all e2e pass (31 = 28 existing + 3 new).

- [ ] **Step 7: Snapshot (no commit).**

---

## Self-review notes

- **Spec coverage:** §4 outline and §4.5 rules → Tasks 6–12 + Global Constraints; §5 dataset → Task 5; §6.1 levels → Tasks 1–2; §6.2 skip banner → Task 3; §6.3 header → Task 4; §6.4 home → Task 4 (+ Task 5 test updates); §7 error handling → Task 1 (bad `from`), Task 3 (<2 levels); §8.1 → Tasks 5, 13; §8.2 → Tasks 1–5; §8.3 → Task 13; §9 respected.
- **Deliberate clarifications of the spec:** problems carry their own `## Setup` (LeetLab format) instead of `dataset: food`; the `now()` lesson never checks `now()` (the task uses only fixed expressions), instead of the spec's `custom` check that would pass any query; the empty-database setup is `CREATE TABLE _start (n int); DROP TABLE _start;` because a lesson needs a dataset or a setup.
- **Type consistency:** `LabLevel`/`Lab.levels` (T1) → `levelStarts`/`LevelStart` (T2) → `skipTarget` (T3); `heroPill` (T4) used in T5 tests; dataset name `food` (T5) used in T8–T11.
- **Placeholders:** none; lesson prose is content to write from each table row and the template files, with check-content as the gate.
