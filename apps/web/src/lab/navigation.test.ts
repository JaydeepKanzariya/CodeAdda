import { describe, expect, it } from 'vitest';
import type { Lab, LessonItem } from '@codeadda/core';
import { chaptersFor, flatItems, itemPath, numberOf } from './navigation';

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
