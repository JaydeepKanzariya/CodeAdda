// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { Lab, LessonItem } from '@codeadda/core';
import { Sidebar } from './Sidebar';

const item = (id: string, chapter: string): LessonItem => ({
  kind: 'lesson', id, title: `Title ${id}`, chapter, order: 1, dataset: 'd', check: 'rows-unordered',
  body: '', task: '', hints: [], solution: '', path: '',
});
const lab: Lab = {
  id: 'sql', title: 'SQL Lab', subtitle: 'Learn', sidebarTitle: 'The SQL Codex', sidebarSubtitle: 'Begin', language: 'sql', datasets: {},
  errors: [{ path: 'lessons/x.md', message: 'Missing "## Task" section' }],
  lessons: [{ title: 'Basics', items: [{ ...item('a', 'Basics'), steps: { tables: { t: { columns: ['x'], rows: [[1]] } }, steps: [] } } as LessonItem, item('b', 'Basics')] }, { title: 'Joins', items: [item('c', 'Joins')] }],
  problems: [],
};

function renderSidebar(activeId = 'b', drawerOpen = false) {
  const onCloseDrawer = vi.fn();
  render(
    <MemoryRouter>
      <Sidebar
        lab={lab}
        tab="lessons"
        activeId={activeId}
        collapsed={false}
        drawerOpen={drawerOpen}
        onCloseDrawer={onCloseDrawer}
        isComplete={(id) => id === 'a'}
      />
    </MemoryRouter>,
  );
  return { onCloseDrawer };
}

describe('Sidebar', () => {
  it('opens only the active chapter and marks the active item', () => {
    renderSidebar('b');
    expect(screen.getByRole('link', { name: /Title b/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /Basics/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Joins/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: /Title c/ })).not.toBeInTheDocument();
  });

  it('expands a closed chapter when clicked, and remembers it', async () => {
    renderSidebar('b');
    await userEvent.click(screen.getByRole('button', { name: /Joins/ }));
    expect(screen.getByRole('button', { name: /Joins/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /Title c/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Title b/ })).toBeInTheDocument();
  });

  it('auto-opens the chapter the active item moves into, without closing others', () => {
    const props = { lab, tab: 'lessons' as const, collapsed: false, drawerOpen: false, onCloseDrawer: () => {}, isComplete: () => false };
    const { rerender } = render(<MemoryRouter><Sidebar {...props} activeId="b" /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: /Title c/ })).not.toBeInTheDocument();
    rerender(<MemoryRouter><Sidebar {...props} activeId="c" /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /Joins/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /Title c/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /Basics/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('numbers lessons across chapters in circle badges, and chapters collapse', async () => {
    renderSidebar('b');
    await userEvent.click(screen.getByRole('button', { name: /Joins/ }));
    expect(screen.getByRole('link', { name: /Title c/ }).querySelector('[data-badge]')).toHaveTextContent('3');
    expect(screen.getByRole('link', { name: /Title b/ }).querySelector('[data-badge]')!.className).toMatch(/bg-brand/);
    await userEvent.click(screen.getByRole('button', { name: /Joins/ }));
    expect(screen.queryByRole('link', { name: /Title c/ })).not.toBeInTheDocument();
  });

  it('shows the codex heading and the animation marker', () => {
    renderSidebar('b');
    expect(screen.getByRole('heading', { name: 'The SQL Codex' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Title a/ })).toContainElement(screen.getByLabelText('has animation'));
    expect(screen.getByRole('link', { name: /Title b/ }).querySelector('[aria-label="has animation"]')).toBeNull();
  });

  it('shows completion ticks instead of badges, and content errors', () => {
    renderSidebar('b');
    const a = screen.getByRole('link', { name: /Title a/ });
    expect(a).toContainElement(screen.getByLabelText('completed'));
    expect(a.querySelector('[data-badge]')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('lessons/x.md');
  });

  it('closes the drawer when a lesson is chosen', async () => {
    const { onCloseDrawer } = renderSidebar('b');
    await userEvent.click(screen.getByRole('link', { name: /Title a/ }));
    expect(onCloseDrawer).toHaveBeenCalled();
  });
});

describe('Sidebar drawer accessibility', () => {
  function mockViewport(desktop: boolean) {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: desktop,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
  }
  afterEach(() => vi.unstubAllGlobals());

  it('makes the closed drawer inert on small screens', () => {
    mockViewport(false);
    renderSidebar('b', false);
    expect(screen.getByRole('complementary', { hidden: true })).toHaveAttribute('inert');
  });

  it('keeps the open drawer reachable on small screens', () => {
    mockViewport(false);
    renderSidebar('b', true);
    expect(screen.getByRole('complementary', { name: 'Lesson list' })).not.toHaveAttribute('inert');
  });

  it('never makes the desktop sidebar inert', () => {
    mockViewport(true);
    renderSidebar('b', false);
    expect(screen.getByRole('complementary', { name: 'Lesson list' })).not.toHaveAttribute('inert');
  });
});

describe('Sidebar collapsed on desktop', () => {
  afterEach(() => vi.unstubAllGlobals());
  const mq = (desktop: boolean) =>
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: desktop, media: query, addEventListener: () => {}, removeEventListener: () => {} }));
  const renderCollapsed = () =>
    render(
      <MemoryRouter>
        <Sidebar lab={lab} tab="lessons" activeId="b" collapsed drawerOpen={false} onCloseDrawer={() => {}} isComplete={() => false} />
      </MemoryRouter>,
    );

  it('hides the sidebar from layout and the accessibility tree, and renders no rail button', () => {
    mq(true);
    renderCollapsed();
    const aside = screen.getByRole('complementary', { hidden: true });
    expect(aside).toHaveAttribute('inert');
    expect(aside.className).toMatch(/lab:hidden/);
    expect(aside.className).not.toMatch(/lab:w-12/);
    expect(screen.queryByRole('button', { name: 'Show lesson list' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hide lesson list' })).not.toBeInTheDocument();
  });

  it('has the id the strip controls', () => {
    mq(true);
    renderCollapsed();
    expect(screen.getByRole('complementary', { hidden: true })).toHaveAttribute('id', 'lab-sidebar');
  });
});

describe('Sidebar problems tab', () => {
  const prob = (id: string, difficulty: 'Easy' | 'Medium' | 'Hard'): LessonItem => ({ ...item(id, 'P'), kind: 'problem', difficulty, title: `A rather long problem title ${id}` });
  const plab: Lab = { ...lab, errors: [], problems: [{ title: 'P', items: [prob('e', 'Easy'), prob('m', 'Medium'), prob('h', 'Hard')] }] };
  const renderProblems = () =>
    render(
      <MemoryRouter>
        <Sidebar lab={plab} tab="problems" activeId="e" collapsed={false} drawerOpen={false} onCloseDrawer={() => {}} isComplete={(id) => id === 'h'} />
      </MemoryRouter>,
    );

  it('keeps every group open by default', () => {
    const two: Lab = { ...plab, problems: [...plab.problems, { title: 'Q', items: [{ ...prob('z', 'Easy'), chapter: 'Q' }] }] };
    render(
      <MemoryRouter>
        <Sidebar lab={two} tab="problems" activeId="e" collapsed={false} drawerOpen={false} onCloseDrawer={() => {}} isComplete={() => false} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /^P/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /^Q/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows the Challenges heading and subtitle', () => {
    renderProblems();
    expect(screen.getByRole('heading', { name: 'Challenges' })).toBeInTheDocument();
    expect(screen.getByText('Original SQL challenges, easy to hard')).toBeInTheDocument();
  });

  it('shows a coloured difficulty dot, no number badge, and untruncated titles', () => {
    renderProblems();
    const e = screen.getByRole('link', { name: /problem title e/ });
    expect(e.querySelector('[aria-label="Easy"]')!.className).toMatch(/bg-ok/);
    expect(screen.getByRole('link', { name: /problem title m/ }).querySelector('[aria-label="Medium"]')!.className).toMatch(/bg-warn/);
    expect(e.querySelector('[data-badge]')).toBeNull();
    expect(screen.getByText('A rather long problem title e').className).not.toMatch(/truncate/);
  });

  it('replaces the dot with a tick when completed', () => {
    renderProblems();
    const h = screen.getByRole('link', { name: /problem title h/ });
    expect(h).toContainElement(screen.getByLabelText('completed'));
    expect(h.querySelector('[aria-label="Hard"]')).toBeNull();
  });
});

describe('Sidebar lessons tab rows', () => {
  it('keeps truncated titles and number badges', () => {
    renderSidebar('b');
    const b = screen.getByRole('link', { name: /Title b/ });
    expect(screen.getByText('Title b').className).toMatch(/truncate/);
    expect(b.className).toMatch(/items-center/);
    expect(b.querySelector('[data-badge]')).not.toBeNull();
  });
});
