import type { Dataset, Lab, LessonItem } from './types';

export function resolveDataset(lab: Pick<Lab, 'datasets'>, item: LessonItem): Dataset {
  if (item.setup) return { name: `setup:${item.id}`, source: item.setup };
  const source = item.dataset ? lab.datasets[item.dataset] : undefined;
  if (source === undefined) throw new Error(`Lesson ${item.id} has no dataset`);
  return { name: item.dataset!, source };
}
