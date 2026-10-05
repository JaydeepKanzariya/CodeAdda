import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadLabFromDir } from '@codeadda/content-loader/node';

const lab = loadLabFromDir(resolve(import.meta.dirname, '../content/mongodb'));
const lessons = lab.lessons.flatMap((c) => c.items);
const problems = lab.problems.flatMap((c) => c.items);

describe('MongoDB lab shape', () => {
  it('has no content errors', () => expect(lab.errors).toEqual([]));

  it('has 15 chapters with the planned lesson counts (40 lessons)', () => {
    expect(lab.lessons.map((c) => [c.title, c.items.length])).toEqual([
      ['Meet Documents', 2],
      ['Projections & Limits', 3],
      ['Comparison Operators', 3],
      ['Inserting Data', 3],
      ['Updating & Deleting', 2],
      ['Complex Queries', 3],
      ['Embedded Documents', 3],
      ['Array Queries', 3],
      ['Array Updates', 3],
      ['Counting & Distinct', 2],
      ['Aggregation Pipeline', 3],
      ['Reshaping Arrays', 3],
      ['Multi-Collection Lookups', 3],
      ['Conditional Expressions', 2],
      ['Reshaping Documents', 2],
    ]);
    expect(lessons).toHaveLength(40);
    expect(lessons[0]!.title).toBe('Your first find');
  });

  it('animates exactly the 10 planned lessons', () => {
    expect(lessons.flatMap((l, i) => (l.steps ? [i + 1] : []))).toEqual([5, 12, 14, 17, 22, 24, 28, 29, 31, 34]);
  });

  it('gives every lesson a Context section', () => {
    expect(lessons.filter((l) => !l.context).map((l) => l.id)).toEqual([]);
  });

  it('gives every lesson an explanation before its first section', () => {
    expect(lessons.filter((l) => !l.body.trim()).map((l) => l.id)).toEqual([]);
  });

  it('has three levels starting at the planned chapters', () => {
    expect(lab.levels).toEqual([
      { title: 'Beginner', from: 'Meet Documents' },
      { title: 'Intermediate', from: 'Complex Queries' },
      { title: 'Advanced', from: 'Aggregation Pipeline' },
    ]);
  });

  it('has 12 problems: 4 Easy, 4 Medium, 4 Hard in the three groups, each self-contained', () => {
    expect(lab.problems.map((c) => [c.title, c.items.map((p) => p.difficulty)])).toEqual([
      ['Warm-up', ['Easy', 'Easy', 'Easy', 'Easy']],
      ['Everyday MongoDB', ['Medium', 'Medium', 'Medium', 'Medium']],
      ['Aggregation & Power', ['Hard', 'Hard', 'Hard', 'Hard']],
    ]);
    expect(problems.filter((p) => !p.setup || !p.tables || !p.example || p.dataset).map((p) => p.id)).toEqual([]);
  });
});

