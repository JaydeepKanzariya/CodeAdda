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

  it('gives every lesson an explanation before its first section', () => {
    expect(lessons.filter((l) => !l.body.trim()).map((l) => l.id)).toEqual([]);
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

