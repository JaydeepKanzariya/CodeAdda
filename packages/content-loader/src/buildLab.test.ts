import { describe, expect, it } from 'vitest';
import { buildLab } from './buildLab';

const labJson = JSON.stringify({
  id: 'demo', title: 'Demo Lab', subtitle: 'Try it', language: 'sql',
  chapters: ['Basics', 'More'], problemGroups: ['Warm-up'],
});

const file = (id: string, chapter: string, order: number, extra = '') => `---
id: ${id}
title: ${id} title
chapter: ${chapter}
order: ${order}
dataset: tiny
${extra}---

Intro.

## Task
Do it.

## Solution
\`\`\`sql
SELECT 1;
\`\`\`
`;

describe('buildLab', () => {
  it('groups lessons by chapter in lab.json order and sorts by order', () => {
    const lab = buildLab({
      labJson,
      files: {
        'datasets/tiny.sql': 'CREATE TABLE t (n int);',
        'lessons/02-more/01-c.md': file('c', 'More', 1),
        'lessons/01-basics/02-b.md': file('b', 'Basics', 2),
        'lessons/01-basics/01-a.md': file('a', 'Basics', 1),
        'problems/01-warm/01-p.md': file('p', 'Warm-up', 1, 'difficulty: Easy\n'),
      },
    });
    expect(lab.lessons.map((c) => [c.title, c.items.map((i) => i.id)])).toEqual([
      ['Basics', ['a', 'b']],
      ['More', ['c']],
    ]);
    expect(lab.problems[0]!.items[0]!.difficulty).toBe('Easy');
    expect(lab.datasets).toEqual({ tiny: 'CREATE TABLE t (n int);' });
    expect(lab.errors).toEqual([]);
  });

  it('passes problemsSubtitle through from lab.json', () => {
    const lab = buildLab({ labJson: JSON.stringify({ ...JSON.parse(labJson), problemsSubtitle: 'Practice' }), files: {} });
    expect(lab.problemsSubtitle).toBe('Practice');
  });

  it('reports duplicate ids, unknown chapters, missing datasets and broken files', () => {
    const lab = buildLab({
      labJson,
      files: {
        'datasets/tiny.sql': '',
        'lessons/01/01.md': file('a', 'Basics', 1),
        'lessons/01/02.md': file('a', 'Basics', 2),
        'lessons/01/03.md': file('z', 'Nowhere', 1),
        'lessons/01/04.md': file('m', 'Basics', 4).replace('dataset: tiny', 'dataset: nope'),
        'lessons/01/05.md': 'no front matter',
      },
    });
    const messages = lab.errors.map((e) => `${e.path}: ${e.message}`);
    expect(messages).toEqual([
      'lessons/01/02.md: Duplicate id "a" (also used in lessons/01/01.md)',
      'lessons/01/03.md: Chapter "Nowhere" is not listed in lab.json',
      'lessons/01/04.md: Dataset "nope" not found in datasets/',
      'lessons/01/05.md: Missing front-matter block (--- … ---) at the top of the file',
    ]);
    expect(lab.lessons[0]!.items.map((i) => i.id)).toEqual(['a']);
  });

  it('ignores _archive files, keeps lessons with a broken script, and reads sidebar titles', () => {
    const broken = file('w', 'Basics', 1).replace('## Task', '## Watch it happen\n```yaml\ntables: {}\nsteps: []\n```\n\n## Task');
    const lab = buildLab({
      labJson: JSON.stringify({ ...JSON.parse(labJson), sidebarTitle: 'The SQL Codex', sidebarSubtitle: 'Begin' }),
      files: {
        'datasets/tiny.sql': '',
        '_archive/lessons/old.md': file('old', 'Basics', 1),
        '_archive/problems/old.md': file('oldp', 'Warm-up', 1, 'difficulty: Easy\n'),
        'lessons/01/01.md': broken,
      },
    });
    expect(lab.lessons.flatMap((c) => c.items.map((i) => i.id))).toEqual(['w']);
    expect(lab.problems).toEqual([]);
    expect(lab.errors).toEqual([{ path: 'lessons/01/01.md', message: expect.stringMatching(/^Watch it happen: /) }]);
    expect(lab.sidebarTitle).toBe('The SQL Codex');
    expect(lab.sidebarSubtitle).toBe('Begin');
  });

  it('throws on an invalid lab.json', () => {
    expect(() => buildLab({ labJson: '{"id":"x"}', files: {} })).toThrow();
  });
});
