import { describe, expect, it } from 'vitest';
import type { LabSummary } from '@codeadda/core';
import { UPCOMING_LABS } from '../content/registry';
import { FEATURES, HERO_DEMO, LIVE_DESCRIPTIONS, STEPS, UPCOMING_COPY, demoSql, heroPill, labStats, labsHeadline, labsLead } from './homeContent';

const summary: LabSummary = {
  id: 'sql', dir: 'sql', title: 'SQL Lab', subtitle: 's', language: 'sql',
  chapters: 2, lessons: 3, problems: 2, animated: 2,
  firstLessonId: 'a', firstProblemId: 'p1',
};

describe('labStats', () => {
  it('counts chapters, lessons, problems and animated lessons, and finds the first paths', () => {
    expect(labStats(summary)).toEqual({
      chapters: 2, lessons: 3, problems: 2, animated: 2, total: 5,
      firstLesson: '/sql/lessons/a', firstProblem: '/sql/problems/p1',
    });
  });

  it('leaves firstProblem undefined when there are no problems', () => {
    const s = labStats({ ...summary, problems: 0, firstProblemId: undefined });
    expect(s.problems).toBe(0);
    expect(s.total).toBe(3);
    expect(s.firstProblem).toBeUndefined();
  });
});

describe('hero demo', () => {
  it('round-trips the token array into the six-line query', () => {
    expect(demoSql(HERO_DEMO)).toBe(
      ['-- Countries with 2+ shoppers', 'SELECT country, COUNT(*) AS shoppers', 'FROM users', 'GROUP BY country', 'HAVING COUNT(*) > 1', 'ORDER BY shoppers DESC, country;'].join('\n'),
    );
  });

  it('keeps every line short enough for a phone-width code block', () => {
    for (const line of demoSql(HERO_DEMO).split('\n')) expect(line.length).toBeLessThanOrEqual(36);
  });

  it('claims exactly three rows with two columns', () => {
    expect(HERO_DEMO.columns).toEqual(['country', 'shoppers']);
    expect(HERO_DEMO.rows).toHaveLength(3);
  });
});

describe('copy tables', () => {
  it('has no upcoming labs while retaining reusable copy entries', () => {
    expect(UPCOMING_LABS).toEqual([]);
    expect(Object.keys(UPCOMING_COPY).sort()).toEqual(['MongoDB', 'PostgreSQL', 'Redis']);
  });

  it('has three steps and four features', () => {
    expect(STEPS).toHaveLength(3);
    expect(FEATURES).toHaveLength(4);
  });

  it('puts the computed animation count into the third feature and degrades without stats', () => {
    expect(FEATURES[2]!.body(labStats(summary))).toMatch(/^2 lessons animate/);
    expect(FEATURES[2]!.body(undefined)).toMatch(/^Lessons animate/);
  });

  it('pluralises the animation count for 0 and 1', () => {
    expect(FEATURES[2]!.body({ ...labStats(summary), animated: 0 })).toMatch(/^Lessons animate/);
    expect(FEATURES[2]!.body({ ...labStats(summary), animated: 1 })).toMatch(/^1 lesson animates/);
  });

  it('has a description for the sql lab', () => {
    expect(LIVE_DESCRIPTIONS.sql).toMatch(/^From your first SELECT/);
  });

  it('never mentions the reference brand or things CodeAdda does not have', () => {
    const text = JSON.stringify({ STEPS, UPCOMING_COPY, features: FEATURES.map((f) => [f.title, f.body(labStats(summary))]) });
    expect(text).not.toMatch(/chai/i);
    expect(text).not.toMatch(/\bXP\b/);
    expect(text).not.toMatch(/sign in/i);
  });
});

describe('labs heading and lead', () => {
  it('renders today (1 live, 3 soon) exactly', () => {
    expect(labsHeadline(1, 3)).toBe('One lab is open. Three more are cooking.');
    expect(labsLead(['SQL'], 3)).toBe('Every lab pairs short lessons with a live database and an instant check. SQL is ready now; the others are being written.');
  });

  it('handles two live labs, one soon, and digits above ten', () => {
    expect(labsHeadline(2, 1)).toBe('Two labs are open. One more is cooking.');
    expect(labsHeadline(11, 12)).toBe('11 labs are open. 12 more are cooking.');
    expect(labsLead(['SQL', 'PostgreSQL'], 2)).toContain('SQL and PostgreSQL are ready now; the others are being written.');
  });

  it('handles none live and none soon', () => {
    expect(labsHeadline(0, 3)).toBe('No lab is open yet. Three more are cooking.');
    expect(labsHeadline(2, 0)).toBe('Two labs are open.');
    expect(labsLead([], 3)).toBe('Every lab pairs short lessons with a live database and an instant check. The first lab is being written.');
    expect(labsLead(['SQL'], 0)).toBe('Every lab pairs short lessons with a live database and an instant check. SQL is ready now.');
  });
});

describe('heroPill', () => {
  const mk = (id: string, title: string, n: number) =>
    ({ ...summary, id, dir: id, title, lessons: n, problems: 0 }) as LabSummary;

  it('reads like today with one lab, counts all labs with two, and says soon with none', () => {
    expect(heroPill([mk('sql', 'SQL Lab', 5)])).toBe('SQL lab now open · 5 exercises');
    expect(heroPill([mk('sql', 'SQL Lab', 5), mk('postgres', 'PostgreSQL Lab', 3)])).toBe('Two labs open · 8 exercises');
    expect(heroPill([])).toBe('Labs opening soon');
  });

  it('has a card description for the PostgreSQL lab', () => {
    expect(LIVE_DESCRIPTIONS.postgres).toBe('From your first table to JSONB, window functions and indexes, all on a food-delivery database.');
  });
});
