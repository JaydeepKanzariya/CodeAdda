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

export interface LevelStart {
  title: string;
  /** 0-based position among the levels that are shown. */
  index: number;
  chapter: string;
}

/** Levels whose starting chapter has lessons, in lab order. Labs without levels return []. */
export function levelStarts(lab: Lab): LevelStart[] {
  const chapters = new Set(lab.lessons.map((c) => c.title));
  return (lab.levels ?? []).filter((l) => chapters.has(l.from)).map((l, index) => ({ title: l.title, index, chapter: l.from }));
}

/** Where "Already know SQL?" sends a learner: the first lesson of the second shown level. */
export function skipTarget(lab: Lab): { level: string; path: string } | undefined {
  const next = levelStarts(lab)[1];
  if (!next) return undefined;
  const first = lab.lessons.find((c) => c.title === next.chapter)?.items[0];
  return first ? { level: next.title, path: itemPath(lab.id, 'lessons', first.id) } : undefined;
}
