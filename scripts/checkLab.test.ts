import { afterAll, describe, expect, it } from 'vitest';
import { buildLab } from '@codeadda/content-loader';
import { PgliteEngine } from '@codeadda/engine-pglite';
import { checkLab } from './checkLab';

const labJson = JSON.stringify({ id: 't', title: 'T', subtitle: '', language: 'sql', chapters: ['A'] });
const lesson = (id: string, order: number, solution: string, extra = '') => `---
id: ${id}
title: ${id}
chapter: A
order: ${order}
dataset: tiny
${extra}---

## Task
Do it.

## Solution
\`\`\`sql
${solution}
\`\`\`
`;

describe('checkLab', () => {
  const engine = new PgliteEngine();
  afterAll(() => engine.dispose());

  it('passes good lessons and reports broken, empty and invalid ones', async () => {
    const lab = buildLab({
      labJson,
      files: {
        'datasets/tiny.sql': 'CREATE TABLE t (n int); INSERT INTO t VALUES (1), (2);',
        'lessons/a/1.md': lesson('good', 1, 'SELECT n FROM t;'),
        'lessons/a/2.md': lesson('broken', 2, 'SELECT nope FROM t;'),
        'lessons/a/3.md': lesson('empty', 3, 'SELECT n FROM t WHERE n > 5;'),
        'lessons/a/4.md': lesson('state-ok', 4, 'INSERT INTO t VALUES (3);', 'check: state\ncheckQuery: SELECT n FROM t ORDER BY n\n'),
        'lessons/a/5.md': 'not a lesson',
      },
    });
    const { checked, failures } = await checkLab(lab, engine);
    expect(checked).toBe(4);
    expect(failures.map((f) => f.path)).toEqual(['lessons/a/5.md', 'lessons/a/2.md', 'lessons/a/3.md']);
    expect(failures[1]!.message).toMatch(/^Solution failed: .*nope/);
    expect(failures[2]!.message).toMatch(/returns no rows/);
  });
});
