import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadLabFromDir } from '@codeadda/content-loader/node';

const lab = loadLabFromDir(resolve(import.meta.dirname, '../content/sql'));
const lessons = lab.lessons.flatMap((c) => c.items);

describe('SQL lab shape (matches the reference structure)', () => {
  it('has no content errors', () => expect(lab.errors).toEqual([]));

  it('has 11 chapters and 62 lessons with the reference counts', () => {
    expect(lab.lessons.map((c) => [c.title, c.items.length])).toEqual([
      ['Querying Data', 5], ['Sorting Data', 3], ['Filtering Data', 10], ['Joining Tables', 7], ['Grouping Data', 6],
      ['Subqueries', 3], ['Set Operators', 2], ['Modifying Data', 10], ['Common Table Expressions', 4],
      ['Advanced Topics', 6], ['Data Types & Constraints', 6],
    ]);
  });

  it('starts and ends with the reference titles', () => {
    expect(lessons[0]!.title).toBe('SELECT All Columns');
    expect(lessons[38]!.title).toBe('INSERT with Specific Columns');
    expect(lessons[42]!.title).toBe('UPDATE with JOIN');
    expect(lessons[61]!.title).toBe('FOREIGN KEY Constraint');
  });

  it('animates exactly the 22 reference lessons', () => {
    const animated = lessons.flatMap((l, i) => (l.steps ? [i + 1] : []));
    expect(animated).toEqual([1, 2, 6, 9, 17, 18, 19, 20, 21, 22, 26, 30, 31, 32, 35, 36, 37, 42, 47, 51, 57, 62]);
  });

  it('gives every lesson a Context section', () => {
    expect(lessons.filter((l) => !l.context).map((l) => l.id)).toEqual([]);
  });

  it('has 3 LeetLab groups with 5, 2 and 1 problems', () => {
    expect(lab.problems.map((c) => [c.title, c.items.length])).toEqual([['SELECT', 5], ['Basic Joins', 2], ['Easy Challenges', 1]]);
  });

  it('gives every problem its own setup, a Tables section and an Example', () => {
    const problems = lab.problems.flatMap((c) => c.items);
    expect(problems.filter((p) => !p.setup || !p.tables || !p.example || p.dataset).map((p) => p.id)).toEqual([]);
  });
});
