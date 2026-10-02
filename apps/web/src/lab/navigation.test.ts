import { describe, expect, it } from 'vitest';
import type { Lab, LessonItem } from '@codeadda/core';
import { chaptersFor, flatItems, itemPath, levelStarts, numberOf, skipTarget } from './navigation';

const item = (id: string, chapter: string, kind: 'lesson' | 'problem' = 'lesson'): LessonItem => ({
  kind, id, title: id, chapter, order: 1, dataset: 'd', check: 'rows-unordered', body: '', task: '', hints: [], solution: '', path: '',
});
const lab: Lab = {
  id: 'sql', title: 'SQL Lab', subtitle: '', language: 'sql', datasets: {}, errors: [],
  lessons: [{ title: 'A', items: [item('a1', 'A'), item('a2', 'A')] }, { title: 'B', items: [item('b1', 'B')] }],
  problems: [{ title: 'P', items: [item('p1', 'P', 'problem')] }],
};

describe('navigation', () => {
  it('flattens items per tab', () => {
    expect(flatItems(lab, 'lessons').map((i) => i.id)).toEqual(['a1', 'a2', 'b1']);
    expect(chaptersFor(lab, 'problems')[0]!.title).toBe('P');
  });
  it('numbers items across chapters', () => {
    expect(numberOf(lab, 'lessons', 'b1')).toBe(3);
    expect(numberOf(lab, 'problems', 'p1')).toBe(1);
  });
  it('builds paths', () => {
    expect(itemPath('sql', 'lessons', 'a1')).toBe('/sql/lessons/a1');
  });
});

describe('levelStarts', () => {
  const item = (id: string, chapter: string) => ({ kind: 'lesson', id, title: id, chapter, order: 1, check: 'rows-unordered', body: '', task: '', hints: [], solution: '', path: '' });
  const lab = {
    id: 'pg', title: 'PG', subtitle: '', language: 'sql', datasets: {}, errors: [], problems: [],
    lessons: [{ title: 'One', items: [item('a', 'One')] }, { title: 'Two', items: [item('b', 'Two')] }],
  } as unknown as Lab;

  it('returns each level that starts at a chapter with lessons, indexed in order', () => {
    expect(levelStarts({ ...lab, levels: [{ title: 'Beginner', from: 'One' }, { title: 'Advanced', from: 'Two' }] })).toEqual([
      { title: 'Beginner', index: 0, chapter: 'One' },
      { title: 'Advanced', index: 1, chapter: 'Two' },
    ]);
  });

  it('skips a level whose chapter has no lessons and returns [] without levels', () => {
    expect(levelStarts({ ...lab, levels: [{ title: 'Ghost', from: 'Empty' }, { title: 'Beginner', from: 'One' }] })).toEqual([{ title: 'Beginner', index: 0, chapter: 'One' }]);
    expect(levelStarts(lab)).toEqual([]);
  });
});

describe('skipTarget', () => {
  const item = (id: string, chapter: string) => ({ kind: 'lesson', id, title: id, chapter, order: 1, check: 'rows-unordered', body: '', task: '', hints: [], solution: '', path: '' });
  const lab = {
    id: 'pg', title: 'PG', subtitle: '', language: 'sql', datasets: {}, errors: [], problems: [],
    lessons: [{ title: 'One', items: [item('a', 'One')] }, { title: 'Two', items: [item('b', 'Two'), item('c', 'Two')] }],
  } as unknown as Lab;

  it('points at the first lesson of the second level', () => {
    expect(skipTarget({ ...lab, levels: [{ title: 'Beginner', from: 'One' }, { title: 'Intermediate', from: 'Two' }] })).toEqual({ level: 'Intermediate', path: '/pg/lessons/b' });
  });

  it('is undefined with fewer than two levels', () => {
    expect(skipTarget({ ...lab, levels: [{ title: 'Beginner', from: 'One' }] })).toBeUndefined();
    expect(skipTarget(lab)).toBeUndefined();
  });
});
