import { describe, expect, it } from 'vitest';
import { firstCodeBlock, parseHints, splitSections } from './sections';
import { splitFrontMatter } from './frontmatter';
import { isContentError, parseItem } from './parseItem';

const lesson = `---
id: where-clause
title: WHERE Clause
chapter: Filtering Data
order: 9
dataset: shop
---

Filter rows.

\`\`\`sql
## not a heading
SELECT 1;
\`\`\`

## Task
Select users from the USA.

## Hint
- Use WHERE.
- Text needs single quotes.

## Solution
\`\`\`sql
SELECT * FROM users WHERE country = 'USA';
\`\`\`
`;

describe('splitFrontMatter', () => {
  it('parses YAML and handles CRLF line endings', () => {
    const { data, body } = splitFrontMatter('---\r\nid: a\r\n---\r\nHello');
    expect(data).toEqual({ id: 'a' });
    expect(body).toBe('Hello');
  });
  it('throws when there is no front-matter', () => {
    expect(() => splitFrontMatter('# Title')).toThrow(/front-matter/);
  });
});

describe('sections', () => {
  it('ignores ## lines inside code fences', () => {
    const { intro, sections } = splitSections(splitFrontMatter(lesson).body);
    expect(intro).toContain('## not a heading');
    expect(Object.keys(sections)).toEqual(['task', 'hint', 'solution']);
  });
  it('extracts the first code block', () => {
    expect(firstCodeBlock('text\n```sql\nSELECT 1;\n```\n')).toBe('SELECT 1;');
    expect(firstCodeBlock('no code')).toBeUndefined();
  });
  it('splits bullet hints and keeps a paragraph as one hint', () => {
    expect(parseHints('- one\n- two\n  more')).toEqual(['one', 'two\n  more']);
    expect(parseHints('Just a sentence.')).toEqual(['Just a sentence.']);
    expect(parseHints('')).toEqual([]);
  });
});

describe('parseItem', () => {
  it('parses a lesson', () => {
    const item = parseItem('lessons/03/09.md', lesson, 'lesson');
    expect(isContentError(item)).toBe(false);
    if (isContentError(item)) return;
    expect(item).toMatchObject({
      kind: 'lesson', id: 'where-clause', chapter: 'Filtering Data', order: 9, dataset: 'shop',
      check: 'rows-unordered', task: 'Select users from the USA.',
      hints: ['Use WHERE.', 'Text needs single quotes.'],
      solution: "SELECT * FROM users WHERE country = 'USA';",
    });
    expect(item.body.startsWith('Filter rows.')).toBe(true);
  });

  it('reports a missing solution', () => {
    const r = parseItem('x.md', lesson.replace(/## Solution[\s\S]*$/, ''), 'lesson');
    expect(r).toEqual({ path: 'x.md', message: 'Missing "## Solution" section with a code block' });
  });

  it('requires checkQuery for state checks', () => {
    const r = parseItem('x.md', lesson.replace('dataset: shop', 'dataset: shop\ncheck: state'), 'lesson');
    expect(isContentError(r) && r.message).toMatch(/checkQuery/);
  });

  it('requires difficulty for problems', () => {
    const r = parseItem('x.md', lesson, 'problem');
    expect(isContentError(r) && r.message).toMatch(/difficulty/);
  });

  it('requires a dataset or a setup section', () => {
    const r = parseItem('x.md', lesson.replace('dataset: shop\n', ''), 'lesson');
    expect(isContentError(r) && r.message).toMatch(/dataset/);
  });
});

describe('parseItem: context and watch it happen', () => {
  const base = (extra: string) => `---
id: x
title: X
chapter: A
order: 1
dataset: shop
---

Intro.

${extra}
## Context
Some context.

## Task
Do it.

## Solution
\`\`\`sql
SELECT 1;
\`\`\`
`;
  const yaml = '```yaml\ntables:\n  t:\n    columns: [a]\n    rows: [[1]]\nsteps:\n  - { label: One, caption: First }\n  - { label: Two, caption: Second }\n```\n';

  it('reads Context and the step script', () => {
    const r = parseItem('lessons/x.md', base(`## Watch it happen\n${yaml}`), 'lesson');
    if (isContentError(r)) throw new Error(r.message);
    expect(r.context).toBe('Some context.');
    expect(r.steps?.steps.map((s) => s.label)).toEqual(['One', 'Two']);
    expect(r.stepsError).toBeUndefined();
  });

  it('keeps the lesson but records a broken script', () => {
    const r = parseItem('lessons/x.md', base('## Watch it happen\n```yaml\ntables: {}\nsteps: []\n```\n'), 'lesson');
    if (isContentError(r)) throw new Error(r.message);
    expect(r.steps).toBeUndefined();
    expect(r.stepsError).toMatch(/table|steps/);
  });

  it('records a missing yaml block', () => {
    const r = parseItem('lessons/x.md', base('## Watch it happen\nno code here\n'), 'lesson');
    if (isContentError(r)) throw new Error(r.message);
    expect(r.stepsError).toMatch(/yaml code block/);
  });

  it('keeps the raw Tables section, and leaves it undefined when absent', () => {
    const r = parseItem('problems/x.md', base('## Tables\n| a |\n|---|\n| 1 |\n'), 'lesson');
    if (isContentError(r)) throw new Error(r.message);
    expect(r.tables).toBe('| a |\n|---|\n| 1 |');
    const r2 = parseItem('problems/x.md', base(''), 'lesson');
    if (isContentError(r2)) throw new Error(r2.message);
    expect(r2.tables).toBeUndefined();
  });

  it('leaves context and steps undefined when absent', () => {
    const r = parseItem('lessons/x.md', base('').replace('## Context\nSome context.\n', ''), 'lesson');
    if (isContentError(r)) throw new Error(r.message);
    expect(r.context).toBeUndefined();
    expect(r.steps).toBeUndefined();
  });
});
