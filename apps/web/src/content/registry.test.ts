import { describe, expect, it } from 'vitest';
import { buildRegistry, getLab, labs, UPCOMING_LABS, upcomingLabs } from './registry';

const lesson = `---
id: a
title: A
chapter: One
order: 1
dataset: d
---

## Task
Do it.

## Solution
\`\`\`sql
SELECT 1;
\`\`\`
`;
const labJson = (id: string) => JSON.stringify({ id, title: id, subtitle: '', language: 'sql', chapters: ['One'] });

describe('buildRegistry', () => {
  it('groups files by lab folder and orders labs sql → postgres → others', () => {
    const result = buildRegistry(
      {
        '../../../../content/zeta/lab.json': labJson('zeta'),
        '../../../../content/postgres/lab.json': labJson('postgres'),
        '../../../../content/sql/lab.json': labJson('sql'),
      },
      {
        '../../../../content/sql/datasets/d.sql': 'CREATE TABLE t (n int);',
        '../../../../content/sql/lessons/01/01.md': lesson,
      },
    );
    expect(result.map((l) => l.id)).toEqual(['sql', 'postgres', 'zeta']);
    expect(result[0]!.lessons[0]!.items[0]!.id).toBe('a');
    expect(result[0]!.datasets).toEqual({ d: 'CREATE TABLE t (n int);' });
  });

  it('skips a lab whose lab.json is invalid', () => {
    expect(buildRegistry({ '../../../../content/bad/lab.json': '{}' }, {})).toEqual([]);
  });
});

describe('real content', () => {
  it('loads the SQL lab from content/', () => {
    expect(labs[0]?.id).toBe('sql');
    expect(getLab('sql')?.lessons[0]?.title).toBe('Querying Data');
    expect(getLab('sql')?.errors).toEqual([]);
  });
});

describe('upcomingLabs', () => {
  it('lists every upcoming name when none is live', () => {
    expect(upcomingLabs([])).toEqual([...UPCOMING_LABS]);
  });

  it('drops names that are live (a registry lab whose title starts with the name)', () => {
    const live = [{ id: 'postgres', title: 'PostgreSQL Lab' }] as unknown as Parameters<typeof upcomingLabs>[0];
    expect(upcomingLabs(live)).toEqual(['MongoDB', 'Redis']);
  });

  it('defaults to the real registry, where only SQL is live today', () => {
    expect(upcomingLabs()).toEqual(['PostgreSQL', 'MongoDB', 'Redis']);
  });
});
