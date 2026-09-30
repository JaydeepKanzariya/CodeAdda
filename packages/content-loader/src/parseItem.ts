import type { ContentError, ItemKind, LessonItem, StepScript } from '@codeadda/core';
import { splitFrontMatter } from './frontmatter';
import { firstCodeBlock, parseHints, splitSections } from './sections';
import { parseSteps } from './steps';
import { formatZodError, itemFrontMatter } from './schema';

export function isContentError(x: LessonItem | ContentError): x is ContentError {
  return !('kind' in x);
}

export function parseItem(path: string, raw: string, kind: ItemKind): LessonItem | ContentError {
  const err = (message: string): ContentError => ({ path, message });
  try {
    const { data, body } = splitFrontMatter(raw);
    const fm = itemFrontMatter.safeParse(data);
    if (!fm.success) return err(formatZodError(fm.error));
    const front = fm.data;

    const { intro, sections } = splitSections(body);
    const task = sections['task'];
    if (!task) return err('Missing "## Task" section');
    const solution = sections['solution'] ? firstCodeBlock(sections['solution']) : undefined;
    if (!solution) return err('Missing "## Solution" section with a code block');
    const setup = sections['setup'] ? firstCodeBlock(sections['setup']) : undefined;
    if (!front.dataset && !setup) return err('Set "dataset" in the front-matter or add a "## Setup" section');
    if (kind === 'problem' && !front.difficulty) return err('Problems need a "difficulty" (Easy, Medium or Hard)');

    let steps: StepScript | undefined;
    let stepsError: string | undefined;
    const watch = sections['watch it happen'];
    if (watch !== undefined) {
      const yamlText = firstCodeBlock(watch);
      const parsed = yamlText ? parseSteps(yamlText) : '"## Watch it happen" needs a ```yaml code block';
      if (typeof parsed === 'string') stepsError = parsed;
      else steps = parsed;
    }

    return {
      kind,
      id: front.id,
      title: front.title,
      chapter: front.chapter,
      order: front.order,
      dataset: front.dataset,
      setup,
      check: front.check,
      checkQuery: front.checkQuery,
      difficulty: front.difficulty,
      body: intro,
      task,
      hints: parseHints(sections['hint'] ?? sections['hints'] ?? ''),
      example: sections['example'] || undefined,
      context: sections['context'] || undefined,
      tables: sections['tables'] || undefined,
      steps,
      stepsError,
      solution,
      path,
    };
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}
