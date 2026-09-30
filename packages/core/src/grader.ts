import { compareResults } from './compare';
import type { Dataset, Engine, LessonItem, QueryResult, QuerySuccess } from './types';

export const CHECK_TIMEOUT_MS = 5000;

export interface CheckResult {
  pass: boolean;
  reason: string;
  expected?: QuerySuccess;
  actual?: QuerySuccess;
  missing: unknown[][];
  extra: unknown[][];
}

const opts = { timeoutMs: CHECK_TIMEOUT_MS };

function fail(reason: string): CheckResult {
  return { pass: false, reason, missing: [], extra: [] };
}

function isTruthy(v: unknown): boolean {
  if (typeof v === 'string') return ['t', 'true', '1'].includes(v.toLowerCase());
  return v === true || v === 1;
}

async function mustRun(engine: Engine, item: LessonItem, query: string, label: string, how: 'run' | 'snapshot' = 'run'): Promise<QuerySuccess> {
  const r: QueryResult = how === 'snapshot' ? await engine.snapshot(query) : await engine.run(query, opts);
  if (!r.ok) throw new Error(`Lesson ${item.id}: ${label} failed: ${r.error.message}`);
  return r;
}

/**
 * Checks a learner query against the lesson. Runs everything on `engine`, which must be a
 * scratch engine (it is reset). Throws only when the lesson's own solution or check query fails.
 */
export async function grade(engine: Engine, item: LessonItem, dataset: Dataset, learnerQuery: string): Promise<CheckResult> {
  await engine.setup(dataset);
  const learner = await engine.run(learnerQuery, opts);
  if (!learner.ok) return fail(`Your query failed: ${learner.error.message}`);

  if (item.check === 'custom') {
    const r = await engine.snapshot(item.checkQuery!);
    const pass = r.ok && isTruthy(r.rows[0]?.[0]);
    return pass
      ? { pass, reason: 'Your change passes the lesson check.', missing: [], extra: [] }
      : fail('The result does not meet the lesson requirement yet.');
  }

  let actual: QuerySuccess = learner;
  if (item.check === 'state') {
    const state = await engine.snapshot(item.checkQuery!);
    if (!state.ok) return fail(`After your query, the lesson check could not run: ${state.error.message}`);
    actual = state;
  }

  await engine.reset();
  const solution = await mustRun(engine, item, item.solution, 'solution');
  const expected = item.check === 'state' ? await mustRun(engine, item, item.checkQuery!, 'check query', 'snapshot') : solution;

  const cmp = compareResults(expected, actual, item.check === 'rows-ordered');
  return { ...cmp, expected, actual };
}
