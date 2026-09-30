import type { Chapter, Lab, LessonItem } from '@codeadda/core';

export type Tab = 'lessons' | 'problems';

export function chaptersFor(lab: Lab, tab: Tab): Chapter[] {
  return tab === 'lessons' ? lab.lessons : lab.problems;
}

export function flatItems(lab: Lab, tab: Tab): LessonItem[] {
  return chaptersFor(lab, tab).flatMap((c) => c.items);
}

export function itemPath(labId: string, tab: Tab, itemId: string): string {
  return `/${labId}/${tab}/${itemId}`;
}

export function numberOf(lab: Lab, tab: Tab, itemId: string): number {
  return flatItems(lab, tab).findIndex((i) => i.id === itemId) + 1;
}
