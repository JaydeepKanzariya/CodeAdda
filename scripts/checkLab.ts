import { grade, resolveDataset, type ContentError, type Engine, type Lab } from '@codeadda/core';

export async function checkLab(lab: Lab, engine: Engine): Promise<{ checked: number; failures: ContentError[] }> {
  const failures: ContentError[] = [...lab.errors];
  const items = [...lab.lessons, ...lab.problems].flatMap((c) => c.items);
  for (const item of items) {
    try {
      // Grading the solution against itself: it can only fail if the solution (or check query) errors.
      const result = await grade(engine, item, resolveDataset(lab, item), item.solution);
      if (!result.pass) {
        const message = result.expected ? result.reason : `Solution failed: ${result.reason.replace(/^Your query failed: /, '')}`;
        failures.push({ path: item.path, message });
      } else if (item.check.startsWith('rows') && result.expected && result.expected.rowCount === 0) {
        failures.push({ path: item.path, message: 'Solution returns no rows — check the task or the dataset' });
      }
    } catch (e) {
      failures.push({ path: item.path, message: e instanceof Error ? e.message : String(e) });
    }
  }
  return { checked: items.length, failures };
}
