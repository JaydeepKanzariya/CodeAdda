import { describe, expect, it } from 'vitest';
import { buildRegistry, getLab, labs } from './registry';

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
