import type { Lab, LabSummary } from '@codeadda/core';
import { labLoaders } from 'virtual:lab-content';
import { labSummaries as generated } from 'virtual:lab-summaries';

const LAB_ORDER = ['sql', 'postgres', 'mongodb', 'redis'];

export function sortByLabOrder<T extends { id: string }>(xs: T[]): T[] {
  const rank = (id: string) => (LAB_ORDER.includes(id) ? LAB_ORDER.indexOf(id) : LAB_ORDER.length);
  return [...xs].sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
}

/** Small per-lab facts, bundled with the page. Full lessons load through loadLab(). */
export const labSummaries: LabSummary[] = sortByLabOrder(generated);

const cache = new Map<string, Promise<Lab | undefined>>();

/**
 * The full lab (prebuilt at build time), fetched as one chunk the first time it is needed.
 * Unknown ids resolve to undefined. A failed load stays failed until the page reloads.
 */
export function loadLab(id: string): Promise<Lab | undefined> {
  let p = cache.get(id);
  if (!p) {
    p = Object.hasOwn(labLoaders, id) ? labLoaders[id]!().then((m) => m.default) : Promise.resolve(undefined);
    cache.set(id, p);
  }
  return p;
}

/** Labs announced in the navbar, lab grid and footer before their content folder exists. */
export const UPCOMING_LABS: readonly UpcomingLab[] = [];
export type UpcomingLab = 'PostgreSQL' | 'MongoDB' | 'Redis';

/** Upcoming names that are not yet live. A lab is live once a lab's title starts with the name. */
export function upcomingLabs(live: { title: string }[] = labSummaries): UpcomingLab[] {
  return UPCOMING_LABS.filter((u) => !live.some((l) => l.title.startsWith(u)));
}
