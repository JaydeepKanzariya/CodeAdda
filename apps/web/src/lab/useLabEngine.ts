import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  grade,
  resolveDataset,
  type CheckResult,
  type Engine,
  type Lab,
  type LabLanguage,
  type LessonItem,
  type QueryResult,
  type SchemaInfo,
  type TableInfo,
} from '@codeadda/core';
import { createEngine as defaultCreateEngine } from '../engine/createEngine';
import { progressStore, type ProgressStore } from '../state/progress';

export const STARTER_SQL = '-- Write your SQL query here\n';
const DESTRUCTIVE = /\b(drop|truncate|alter)\b/i;
const RESET_HINT = 'You changed the database structure — use Reset DB to restore the lesson data.';
/** SQLSTATEs most often caused by state left over from an earlier attempt. */
const LEFTOVER_STATE_CODES = new Set(['42P07', '42710', '23505', '25P02']);
const LEFTOVER_HINT = ' — If this comes from an earlier attempt, use Reset DB to restore the lesson data.';

function withLeftoverHint(result: QueryResult): QueryResult {
  if (result.ok || !result.error.code || !LEFTOVER_STATE_CODES.has(result.error.code)) return result;
  return { ...result, error: { ...result.error, message: result.error.message + LEFTOVER_HINT } };
}

export interface LabEngine {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  schema?: SchemaInfo;
  result?: QueryResult;
  check?: CheckResult;
  running: boolean;
  runId: number;
  /** Sets the sandbox up (once); concurrent calls share the same work. No-op when already loaded. */
  load(): Promise<void>;
  run(query: string): Promise<void>;
  reset(): Promise<void>;
  sample(t: TableInfo): Promise<void>;
  retry(): void;
}

type State = Omit<LabEngine, 'load' | 'run' | 'reset' | 'sample' | 'retry'>;

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function useLabEngine(
  lab: Lab,
  item: LessonItem,
  opts: { autoLoad?: boolean; createEngine?: (l: LabLanguage) => Engine; progress?: ProgressStore } = {},
): LabEngine {
  const autoLoad = opts.autoLoad ?? true;
  const make = opts.createEngine ?? defaultCreateEngine;
  const progress = opts.progress ?? progressStore;
  const engines = useRef<{ main: Engine; grader: Engine } | null>(null);
  /** Bumped on every lesson change; results of work started for an earlier lesson are dropped. */
  const generation = useRef(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<State>({ status: autoLoad ? 'loading' : 'idle', running: false, runId: 0 });
  const dataset = useMemo(() => resolveDataset(lab, item), [lab, item]);

  useEffect(() => {
    const main = make(lab.language);
    const grader = make(lab.language);
    engines.current = { main, grader };
    return () => {
      engines.current = null;
      void main.dispose();
      void grader.dispose();
    };
  }, [lab.language, make]);

  const statusRef = useRef(state.status);
  statusRef.current = state.status;
  /** In-flight (or finished) load for the current lesson; resolves to whether the sandbox is ready. */
  const loading = useRef<Promise<boolean> | null>(null);
  const startLoad = useRef<() => Promise<boolean>>(async () => false);
  /** Set by retry() so a deferred (autoLoad: false) hook loads again after the reset. */
  const retryPending = useRef(false);

  useEffect(() => {
    const e = engines.current;
    if (!e) return;
    generation.current += 1;
    const gen = generation.current;
    loading.current = null;
    // Spec §3.1: every lesson starts from a fresh sandbox, even when the dataset is the same.
    const shouldLoad = autoLoad || retryPending.current;
    retryPending.current = false;
    setState((s) => ({
      ...s,
      status: shouldLoad ? 'loading' : 'idle',
      error: undefined,
      running: false,
      result: undefined,
      check: undefined,
      schema: undefined,
    }));
    const loadNow = async (): Promise<boolean> => {
      try {
        await e.main.setup(dataset);
        const schema = await e.main.describe();
        if (gen !== generation.current) return false;
        setState((s) => ({ ...s, status: 'ready', schema }));
        return true;
      } catch (err) {
        if (gen === generation.current) setState((s) => ({ ...s, status: 'error', error: message(err) }));
        return false;
      }
    };
    startLoad.current = () => {
      if (!loading.current) {
        if (gen === generation.current) setState((s) => (s.status === 'idle' ? { ...s, status: 'loading' } : s));
        loading.current = loadNow();
      }
      return loading.current;
    };
    if (shouldLoad) void startLoad.current();
    return () => {
      generation.current += 1; // drop anything still in flight for this lesson
    };
  }, [dataset, reloadKey, autoLoad]);

  const load = useCallback(async () => {
    await startLoad.current();
  }, []);

  const run = useCallback(
    async (query: string) => {
      const e = engines.current;
      if (!e) return;
      if (statusRef.current === 'idle' || statusRef.current === 'loading') {
        if (!(await startLoad.current())) return;
      }
      if (engines.current !== e) return;
      const gen = generation.current;
      setState((s) => ({ ...s, running: true, check: undefined }));
      try {
        let result = withLeftoverHint(await e.main.run(query));
        let check: CheckResult | undefined;
        let schema: SchemaInfo | undefined;
        if (result.ok) {
          if (DESTRUCTIVE.test(query)) result = { ...result, notice: result.notice ? `${result.notice} ${RESET_HINT}` : RESET_HINT };
          try {
            check = await grade(e.grader, item, dataset, query);
            if (check.pass) progress.markComplete(lab.id, item.id);
          } catch (err) {
            check = { pass: false, reason: `Could not check this answer: ${message(err)}`, missing: [], extra: [] };
          }
          schema = await e.main.describe().catch(() => undefined);
        }
        if (gen !== generation.current) return; // the learner moved to another lesson meanwhile
        setState((s) => ({ ...s, running: false, result, check, schema: schema ?? s.schema, runId: s.runId + 1 }));
      } catch (err) {
        if (gen !== generation.current) return;
        setState((s) => ({
          ...s,
          running: false,
          result: { ok: false, error: { message: message(err) } },
          check: undefined,
          runId: s.runId + 1,
        }));
      }
    },
    [lab.id, item, dataset, progress],
  );

  const reset = useCallback(async () => {
    const e = engines.current;
    if (!e) return;
    const gen = generation.current;
    setState((s) => ({ ...s, running: true }));
    try {
      await e.main.reset();
      const schema = await e.main.describe();
      if (gen !== generation.current) return;
      setState((s) => ({
        ...s,
        running: false,
        schema,
        check: undefined,
        result: { ok: true, columns: [], rows: [], rowCount: 0, durationMs: 0, notice: 'Database reset to the lesson data.' },
        runId: s.runId + 1,
      }));
    } catch (err) {
      if (gen !== generation.current) return;
      setState((s) => ({ ...s, running: false, result: { ok: false, error: { message: message(err) } } }));
    }
  }, []);

  const sample = useCallback(async (t: TableInfo) => {
    const e = engines.current;
    if (!e) return;
    const gen = generation.current;
    setState((s) => ({ ...s, running: true }));
    try {
      const result = await e.main.run(t.sampleQuery);
      if (gen !== generation.current) return;
      setState((s) => ({ ...s, running: false, result, check: undefined, runId: s.runId + 1 }));
    } catch (err) {
      if (gen !== generation.current) return;
      setState((s) => ({ ...s, running: false, result: { ok: false, error: { message: message(err) } }, check: undefined, runId: s.runId + 1 }));
    }
  }, []);

  const retry = useCallback(() => {
    if (!autoLoad) retryPending.current = true;
    setReloadKey((k) => k + 1);
  }, [autoLoad]);

  return { ...state, load, run, reset, sample, retry };
}
