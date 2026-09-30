import { describe, expect, it } from 'vitest';
import { grade } from './grader';
import { resolveDataset } from './dataset';
import type { Dataset, Engine, LessonItem, QueryResult, QuerySuccess, SchemaInfo } from './types';

const ok = (columns: string[], rows: unknown[][]): QuerySuccess => ({
  ok: true, columns, rows, rowCount: rows.length, durationMs: 0,
});

class FakeEngine implements Engine {
  readonly kind = 'sql' as const;
  readonly mode = 'browser' as const;
  calls: string[] = [];
  constructor(private responses: Record<string, QueryResult>) {}
  async setup(_d: Dataset) { this.calls.push('setup'); }
  async run(q: string): Promise<QueryResult> {
    this.calls.push(`run:${q}`);
    return this.responses[q] ?? { ok: false, error: { message: `unknown query ${q}` } };
  }
  async reset() { this.calls.push('reset'); }
  async snapshot(q: string): Promise<QueryResult> {
    this.calls.push(`snapshot:${q}`);
    return this.responses[q] ?? { ok: false, error: { message: `unknown query ${q}` } };
  }
  async describe(): Promise<SchemaInfo> { return { tables: [], relationships: [] }; }
  async dispose() {}
}

const item = (over: Partial<LessonItem> = {}): LessonItem => ({
  kind: 'lesson', id: 'demo', title: 'Demo', chapter: 'Basics', order: 1, dataset: 'shop',
  check: 'rows-unordered', body: '', task: 'Do it', hints: [], solution: 'SOLUTION', path: 'x.md',
  ...over,
});
const ds: Dataset = { name: 'shop', source: 'CREATE TABLE t (n int);' };

describe('grade', () => {
  it('runs the learner query and the solution on fresh copies and passes when they match', async () => {
    const engine = new FakeEngine({ LEARNER: ok(['n'], [[2], [1]]), SOLUTION: ok(['n'], [[1], [2]]) });
    const r = await grade(engine, item(), ds, 'LEARNER');
    expect(r.pass).toBe(true);
    expect(engine.calls).toEqual(['setup', 'run:LEARNER', 'reset', 'run:SOLUTION']);
  });

  it('fails with the error message when the learner query fails', async () => {
    const engine = new FakeEngine({ SOLUTION: ok(['n'], [[1]]) });
    const r = await grade(engine, item(), ds, 'BROKEN');
    expect(r.pass).toBe(false);
    expect(r.reason).toMatch(/unknown query BROKEN/);
  });

  it('uses the check query for state lessons', async () => {
    const engine = new FakeEngine({
      LEARNER: ok([], []), SOLUTION: ok([], []), CHECK: ok(['n'], [[1]]),
    });
    const r = await grade(engine, item({ check: 'state', checkQuery: 'CHECK' }), ds, 'LEARNER');
    expect(r.pass).toBe(true);
    expect(engine.calls).toEqual(['setup', 'run:LEARNER', 'snapshot:CHECK', 'reset', 'run:SOLUTION', 'snapshot:CHECK']);
  });

  it('fails a state lesson when the check query fails after the learner query (e.g. table dropped)', async () => {
    const engine = new FakeEngine({ 'DROP TABLE t': ok([], []), SOLUTION: ok([], []) });
    const r = await grade(engine, item({ check: 'state', checkQuery: 'CHECK' }), ds, 'DROP TABLE t');
    expect(r.pass).toBe(false);
    expect(r.reason).toMatch(/check could not run/i);
  });

  it('passes a custom lesson when the check query returns a truthy first value', async () => {
    const engine = new FakeEngine({ LEARNER: ok([], []), CHECK: ok(['ok'], [[true]]) });
    expect((await grade(engine, item({ check: 'custom', checkQuery: 'CHECK' }), ds, 'LEARNER')).pass).toBe(true);
    expect(engine.calls).toEqual(['setup', 'run:LEARNER', 'snapshot:CHECK']);
  });

  it('throws when the lesson solution itself fails', async () => {
    const engine = new FakeEngine({ LEARNER: ok(['n'], [[1]]) });
    await expect(grade(engine, item(), ds, 'LEARNER')).rejects.toThrow(/demo: solution failed/);
  });
});

describe('resolveDataset', () => {
  it('uses the named dataset', () => {
    expect(resolveDataset({ datasets: { shop: 'SQL' } }, item())).toEqual({ name: 'shop', source: 'SQL' });
  });
  it('prefers an inline setup block', () => {
    expect(resolveDataset({ datasets: {} }, item({ dataset: undefined, setup: 'CREATE TABLE x ();' })))
      .toEqual({ name: 'setup:demo', source: 'CREATE TABLE x ();' });
  });
  it('throws when the dataset is missing', () => {
    expect(() => resolveDataset({ datasets: {} }, item())).toThrow(/no dataset/);
  });
});
