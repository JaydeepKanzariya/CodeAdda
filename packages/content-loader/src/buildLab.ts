import type { Chapter, ContentError, ItemKind, Lab, LessonItem } from '@codeadda/core';
import { isContentError, parseItem } from './parseItem';
import { labJson as labJsonSchema } from './schema';

export interface LabSource {
  labJson: string;
  files: Record<string, string>;
}

const DATASET = /^datasets\/([^/]+)\.(sql|json|redis)$/;

export function buildLab(src: LabSource): Lab {
  const meta = labJsonSchema.parse(JSON.parse(src.labJson));
  const errors: ContentError[] = [];
  const datasets: Record<string, string> = {};
  const parsed: LessonItem[] = [];

  const paths = Object.keys(src.files).sort();
  for (const path of paths) {
    const d = DATASET.exec(path);
    if (d) datasets[d[1]!] = src.files[path]!;
  }

  const seen = new Map<string, string>();
  for (const path of paths) {
    if (!path.endsWith('.md')) continue;
    const kind: ItemKind | null = path.startsWith('lessons/') ? 'lesson' : path.startsWith('problems/') ? 'problem' : null;
    if (!kind) continue;
    const r = parseItem(path, src.files[path]!, kind);
    if (isContentError(r)) { errors.push(r); continue; }
    const other = seen.get(r.id);
    if (other) { errors.push({ path, message: `Duplicate id "${r.id}" (also used in ${other})` }); continue; }
    const chapters = kind === 'lesson' ? meta.chapters : meta.problemGroups;
    if (!chapters.includes(r.chapter)) { errors.push({ path, message: `Chapter "${r.chapter}" is not listed in lab.json` }); continue; }
    if (r.dataset && !r.setup && datasets[r.dataset] === undefined) {
      errors.push({ path, message: `Dataset "${r.dataset}" not found in datasets/` });
      continue;
    }
    seen.set(r.id, path);
    if (r.stepsError) errors.push({ path, message: `Watch it happen: ${r.stepsError}` });
    parsed.push(r);
  }

  const group = (kind: ItemKind, titles: string[]): Chapter[] =>
    titles
      .map((title) => ({
        title,
        items: parsed
          .filter((i) => i.kind === kind && i.chapter === title)
          .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
      }))
      .filter((c) => c.items.length > 0);

  return {
    id: meta.id,
    title: meta.title,
    subtitle: meta.subtitle,
    language: meta.language,
    sidebarTitle: meta.sidebarTitle,
    sidebarSubtitle: meta.sidebarSubtitle,
    problemsSubtitle: meta.problemsSubtitle,
    lessons: group('lesson', meta.chapters),
    problems: group('problem', meta.problemGroups),
    datasets,
    errors,
  };
}
