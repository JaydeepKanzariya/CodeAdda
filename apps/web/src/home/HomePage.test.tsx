// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { Lab } from '@codeadda/core';
import { getLab, labs, upcomingLabs } from '../content/registry';
import { progressStore } from '../state/progress';
import { heroPill, labStats } from './homeContent';
import { HomePage } from './HomePage';

const renderHome = () => render(<MemoryRouter><HomePage /></MemoryRouter>);
const labsRegion = () => screen.getByRole('region', { name: 'Two labs are open. Two more are cooking.' });

describe('HomePage', () => {
  it('has one h1, the primary link and the SQL card both pointing at /sql', () => {
    renderHome();
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('Pull up a chair');
    expect(screen.getByRole('link', { name: /Start the SQL lab/ })).toHaveAttribute('href', '/sql');
    expect(within(labsRegion()).getByRole('link', { name: /Learn SQL, one query at a time/ })).toHaveAttribute('href', '/sql');
  });

  it('shows numbers computed from the registry, not literals', () => {
    renderHome();
    const stats = labStats(getLab('sql')!);
    const value = (label: string) => screen.getByText(label).nextElementSibling!.textContent;
    expect(value('SQL lessons')).toBe(String(stats.lessons));
    expect(value('practice problems')).toBe(String(stats.problems));
    expect(value('animated walkthroughs')).toBe(String(stats.animated));
    expect(screen.getByText(heroPill(labs))).toBeInTheDocument();
    expect(within(labsRegion()).getByText(`${stats.chapters} chapters · ${stats.total} exercises`)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`^${stats.animated} lessons animate`))).toBeInTheDocument();
  });

  it('renders the upcoming labs as non-clickable coming-soon cards', () => {
    renderHome();
    const region = labsRegion();
    expect(within(region).getAllByRole('listitem')).toHaveLength(labs.length + upcomingLabs().length);
    expect(within(region).getAllByText('Coming soon')).toHaveLength(upcomingLabs().length);
    for (const name of upcomingLabs()) {
      const card = within(region).getByText(name).closest('[data-testid="coming-soon-card"]')!;
      expect(card).not.toBeNull();
      expect(card.querySelector('a, button')).toBeNull();
    }
    expect(screen.queryByRole('link', { name: /MongoDB/ })).toBeNull();
  });

  it('renders the steps, features, CTA and footer with real targets', () => {
    renderHome();
    const stats = labStats(getLab('sql')!);
    expect(screen.getByRole('heading', { name: 'Read, run, check, repeat' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3, name: /Pick a lesson|Run your query|Get a verdict/ })).toHaveLength(3);
    expect(screen.getByRole('heading', { name: 'Built so practice turns into habit.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start lesson one/ })).toHaveAttribute('href', stats.firstLesson);
    expect(screen.getByRole('link', { name: 'Try a problem' })).toHaveAttribute('href', stats.firstProblem);
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'First lesson' })).toHaveAttribute('href', stats.firstLesson);
    expect(within(footer).getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '#how');
    expect(within(footer).getByText(`© ${new Date().getFullYear()} CodeAdda`)).toBeInTheDocument();
  });

  it('only links inside the app and never mentions the reference brand, XP or sign-in', () => {
    const { container } = renderHome();
    for (const a of Array.from(container.querySelectorAll('a'))) expect(a.getAttribute('href')).toMatch(/^[/#]/);
    expect(container.textContent).not.toMatch(/\bchai\b/i);
    expect(container.textContent).not.toMatch(/\bXP\b/);
    expect(container.textContent).not.toMatch(/sign in/i);
    expect(screen.getByText('Correct!')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('says Open before any progress and Continue after a completed lesson', () => {
    const { unmount } = renderHome();
    expect(within(labsRegion()).getAllByText('Open')).toHaveLength(labs.length);
    unmount();
    progressStore.markComplete('sql', 'select-all');
    renderHome();
    expect(within(labsRegion()).getByText('Continue')).toBeInTheDocument();
  });

  it('renders without the SQL lab: no stats, no CTA, only coming-soon cards', async () => {
    vi.resetModules();
    vi.doMock('../content/registry', async () => {
      const real = await vi.importActual<typeof import('../content/registry')>('../content/registry');
      return { ...real, labs: [], getLab: () => undefined, upcomingLabs: () => [...real.UPCOMING_LABS] };
    });
    try {
      const { HomePage: Empty } = await import('./HomePage');
      render(<MemoryRouter><Empty /></MemoryRouter>);
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(screen.getByText('Labs opening soon')).toBeInTheDocument();
      expect(screen.queryByText('SQL lessons')).toBeNull();
      expect(screen.queryByRole('link', { name: /Start the SQL lab/ })).toBeNull();
      expect(screen.queryByRole('heading', { name: 'The database is already running.' })).toBeNull();
      const region = screen.getByRole('region', { name: 'No lab is open yet. Three more are cooking.' });
      expect(within(region).getAllByRole('listitem')).toHaveLength(3);
      expect(within(region).queryByRole('link')).toBeNull();
    } finally {
      vi.doUnmock('../content/registry');
    }
  });

  it('gives every registry lab a card and a footer link, before the coming-soon cards', async () => {
    vi.resetModules();
    vi.doMock('../content/registry', async () => {
      const real = await vi.importActual<typeof import('../content/registry')>('../content/registry');
      const sql = real.labs[0]!;
      const pg: Lab = {
        id: 'postgres', title: 'PostgreSQL Lab', subtitle: 'The Postgres extras', language: 'sql', datasets: {}, errors: [],
        lessons: [{ title: 'A', items: [{ ...sql.lessons[0]!.items[0]! }] }], problems: [],
      };
      return { ...real, labs: [sql, pg], getLab: real.getLab, upcomingLabs: () => ['MongoDB', 'Redis'] };
    });
    try {
      const { HomePage: Two } = await import('./HomePage');
      render(<MemoryRouter><Two /></MemoryRouter>);
      const region = screen.getByRole('region', { name: 'Two labs are open. Two more are cooking.' });
      expect(within(region).getAllByRole('listitem')).toHaveLength(4);
      const pgLinks = within(region).getAllByRole('link', { name: /PostgreSQL/ });
      expect(pgLinks).toHaveLength(1);
      expect(pgLinks[0]).toHaveAttribute('href', '/postgres');
      expect(within(region).getAllByText('Coming soon')).toHaveLength(2);
      expect(within(screen.getByRole('contentinfo')).getByRole('link', { name: 'PostgreSQL Lab' })).toBeInTheDocument();
    } finally {
      vi.doUnmock('../content/registry');
    }
  });
});
