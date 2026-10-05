import { describe, expect, it, vi } from 'vitest';
import { UPCOMING_LABS, labSummaries, loadLab, sortByLabOrder, upcomingLabs } from './registry';

describe('registry', () => {
  it('lists both live labs as summaries, SQL first', () => {
    expect(labSummaries.map((s) => s.id)).toEqual(['sql', 'postgres']);
    expect(labSummaries[0]).toMatchObject({ title: 'SQL Lab', lessons: 62, problems: 8 });
  });

  it('orders sql → postgres → mongodb → redis → others alphabetically', () => {
    const ids = ['zeta', 'redis', 'alpha', 'postgres', 'sql'].map((id) => ({ id }));
    expect(sortByLabOrder(ids).map((x) => x.id)).toEqual(['sql', 'postgres', 'redis', 'alpha', 'zeta']);
  });

  it('loads one full lab on demand, caches it, and returns undefined for an unknown id', async () => {
    const pg = await loadLab('postgres');
    expect(pg?.lessons.flatMap((c) => c.items)).toHaveLength(46);
    expect(await loadLab('postgres')).toBe(pg);
    expect(await loadLab('nope')).toBeUndefined();
    expect(await loadLab('constructor')).toBeUndefined();
    expect(await loadLab('toString')).toBeUndefined();
  });

  it('keeps a failed load failed, so the error boundary sees the same rejection', async () => {
    vi.resetModules();
    const loader = vi.fn(() => Promise.reject(new Error('chunk failed')));
    vi.doMock('virtual:lab-content', () => ({ labLoaders: { broken: loader } }));
    try {
      const fresh = await import('./registry');
      const first = fresh.loadLab('broken');
      await expect(first).rejects.toThrow('chunk failed');
      expect(fresh.loadLab('broken')).toBe(first);
      expect(loader).toHaveBeenCalledTimes(1);
    } finally {
      vi.doUnmock('virtual:lab-content');
      vi.resetModules();
    }
  });
});

describe('upcomingLabs', () => {
  it('lists every upcoming name when none is live', () => expect(upcomingLabs([])).toEqual([...UPCOMING_LABS]));
  it('drops names that are live', () => expect(upcomingLabs([{ title: 'PostgreSQL Lab' }])).toEqual(['MongoDB', 'Redis']));
  it('defaults to the real labs, where SQL and PostgreSQL are live', () => expect(upcomingLabs()).toEqual(['MongoDB', 'Redis']));
});
