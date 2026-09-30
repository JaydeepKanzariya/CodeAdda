// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Engine, Lab, LessonItem, QueryResult } from '@codeadda/core';
import { createProgressStore } from '../state/progress';
import { memoryStorage } from '../state/storage';
import { useLabEngine } from './useLabEngine';

const item: LessonItem = {
  kind: 'lesson', id: 'one', title: 'One', chapter: 'Basics', order: 1, dataset: 'tiny', check: 'rows-unordered',
  body: '', task: '', hints: [], solution: 'SELECT 1', path: 'x.md',
};
const lab: Lab = {
  id: 'demo', title: 'Demo', subtitle: '', language: 'sql', errors: [], problems: [],
  lessons: [{ title: 'Basics', items: [item] }], datasets: { tiny: 'CREATE TABLE t (n int);' },
};

const item2: LessonItem = { ...item, id: 'two', title: 'Two', order: 2 };
const lab2: Lab = { ...lab, lessons: [{ title: 'Basics', items: [item, item2] }] };

function fakeFactory(opts: { failSetup?: boolean; runs?: Record<string, () => Promise<QueryResult>> } = {}) {
  const created: Engine[] = [];
  const factory = (): Engine => {
    const engine: Engine = {
      kind: 'sql',
      mode: 'browser',
      setup: vi.fn(async () => {
        if (opts.failSetup) throw new Error('bad dataset');
      }),
      run: vi.fn(async (q: string): Promise<QueryResult> =>
        opts.runs?.[q] ? opts.runs[q]!() : q.includes('BROKEN')
          ? { ok: false, error: { message: 'syntax error' } }
          : { ok: true, columns: ['n'], rows: [[q.includes('2') ? 2 : 1]], rowCount: 1, durationMs: 1 },
      ),
      reset: vi.fn(async () => {}),
      snapshot: vi.fn(),
      describe: vi.fn(async () => ({ tables: [], relationships: [] })),
      dispose: vi.fn(async () => {}),
    };
    created.push(engine);
    return engine;
  };
  return { factory, created };
}

describe('useLabEngine', () => {
  it('loads the dataset, runs, checks and records completion', async () => {
    const { factory } = fakeFactory();
    const progress = createProgressStore(memoryStorage());
    const { result } = renderHook(() => useLabEngine(lab, item, { createEngine: factory, progress }));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => {
      await result.current.run('SELECT 1');
    });
    expect(result.current.result?.ok).toBe(true);
    expect(result.current.check?.pass).toBe(true);
    expect(progress.isComplete('demo', 'one')).toBe(true);
  });

  it('shows a wrong answer without completing the lesson', async () => {
    const { factory } = fakeFactory();
    const progress = createProgressStore(memoryStorage());
    const { result } = renderHook(() => useLabEngine(lab, item, { createEngine: factory, progress }));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => {
      await result.current.run('SELECT 2');
    });
    expect(result.current.check?.pass).toBe(false);
    expect(progress.isComplete('demo', 'one')).toBe(false);
  });

  it('does not check a failing query', async () => {
    const { factory } = fakeFactory();
    const { result } = renderHook(() => useLabEngine(lab, item, { createEngine: factory, progress: createProgressStore(memoryStorage()) }));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => {
      await result.current.run('BROKEN');
    });
    expect(result.current.result).toEqual({ ok: false, error: { message: 'syntax error' } });
    expect(result.current.check).toBeUndefined();
  });

  it('adds a reset hint after destructive queries and resets on request', async () => {
    const { factory, created } = fakeFactory();
    const { result } = renderHook(() => useLabEngine(lab, item, { createEngine: factory, progress: createProgressStore(memoryStorage()) }));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => {
      await result.current.run('DROP TABLE t');
    });
    expect(result.current.result?.ok && result.current.result.notice).toMatch(/use Reset DB/);
    await act(async () => {
      await result.current.reset();
    });
    expect(created[0]!.reset).toHaveBeenCalled();
    expect(result.current.result?.ok && result.current.result.notice).toBe('Database reset to the lesson data.');
  });

  it('reports a dataset that fails to load and retries', async () => {
    const { factory } = fakeFactory({ failSetup: true });
    const { result } = renderHook(() => useLabEngine(lab, item, { createEngine: factory, progress: createProgressStore(memoryStorage()) }));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('bad dataset');
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('disposes both engines on unmount', async () => {
    const { factory, created } = fakeFactory();
    const { result, unmount } = renderHook(() => useLabEngine(lab, item, { createEngine: factory, progress: createProgressStore(memoryStorage()) }));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    unmount();
    expect(created.every((e) => (e.dispose as ReturnType<typeof vi.fn>).mock.calls.length === 1)).toBe(true);
  });

  it('re-seeds the main sandbox on every lesson change, even with the same dataset', async () => {
    const { factory, created } = fakeFactory();
    const progress = createProgressStore(memoryStorage());
    const { result, rerender } = renderHook(({ it }) => useLabEngine(lab2, it, { createEngine: factory, progress }), {
      initialProps: { it: item },
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(created[0]!.setup).toHaveBeenCalledTimes(1);
    rerender({ it: item2 });
    await waitFor(() => expect(created[0]!.setup).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('adds the Reset DB hint to errors likely caused by leftover state', async () => {
    const codes = ['42P07', '42710', '23505', '25P02'];
    const runs = Object.fromEntries(
      codes.map((code) => [`Q${code}`, async (): Promise<QueryResult> => ({ ok: false, error: { message: `boom ${code}`, code } })]),
    );
    const { factory } = fakeFactory({ runs });
    const { result } = renderHook(() => useLabEngine(lab, item, { createEngine: factory, progress: createProgressStore(memoryStorage()) }));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    for (const code of codes) {
      await act(async () => {
        await result.current.run(`Q${code}`);
      });
      const r = result.current.result;
      expect(r?.ok).toBe(false);
      if (r && !r.ok) {
        expect(r.error.message).toMatch(new RegExp(`^boom ${code} — If this comes from an earlier attempt, use Reset DB`));
        expect(r.error.code).toBe(code);
      }
    }
    await act(async () => {
      await result.current.run('BROKEN');
    });
    expect(result.current.result).toEqual({ ok: false, error: { message: 'syntax error' } });
  });

  it('ignores the result of a run started before navigating to another lesson', async () => {
    let finish!: (r: QueryResult) => void;
    const okResult: QueryResult = { ok: true, columns: ['n'], rows: [[1]], rowCount: 1, durationMs: 1 };
    let calls = 0;
    // Only the learner's run on the main sandbox is slow; the grader's copy answers at once.
    const slow = () =>
      calls++ === 0 ? new Promise<QueryResult>((resolve) => { finish = resolve; }) : Promise.resolve(okResult);
    const { factory, created } = fakeFactory({ runs: { SLOW: slow } });
    const progress = createProgressStore(memoryStorage());
    const { result, rerender } = renderHook(({ it }) => useLabEngine(lab2, it, { createEngine: factory, progress }), {
      initialProps: { it: item },
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.run('SLOW');
    });
    expect(result.current.running).toBe(true);
    rerender({ it: item2 });
    await waitFor(() => expect(created[0]!.setup).toHaveBeenCalledTimes(2));
    await act(async () => {
      finish(okResult);
      await pending;
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.result).toBeUndefined();
    expect(result.current.check).toBeUndefined();
    expect(result.current.running).toBe(false);
  });

  describe('deferred loading (autoLoad: false)', () => {
    const progress = () => createProgressStore(memoryStorage());

    it('starts idle and never calls setup', async () => {
      const { factory, created } = fakeFactory();
      const { result } = renderHook(() => useLabEngine(lab, item, { autoLoad: false, createEngine: factory, progress: progress() }));
      expect(result.current.status).toBe('idle');
      await act(async () => {});
      expect(result.current.status).toBe('idle');
      expect(created[0]!.setup).not.toHaveBeenCalled();
    });

    it('load() sets up once, describes, and ends ready with a schema', async () => {
      const { factory, created } = fakeFactory();
      const { result } = renderHook(() => useLabEngine(lab, item, { autoLoad: false, createEngine: factory, progress: progress() }));
      await act(async () => {
        await result.current.load();
      });
      expect(result.current.status).toBe('ready');
      expect(result.current.schema).toEqual({ tables: [], relationships: [] });
      expect(created[0]!.setup).toHaveBeenCalledTimes(1);
      expect(created[0]!.describe).toHaveBeenCalled();
    });

    it('shares one setup between concurrent load() calls', async () => {
      const { factory, created } = fakeFactory();
      const { result } = renderHook(() => useLabEngine(lab, item, { autoLoad: false, createEngine: factory, progress: progress() }));
      await act(async () => {
        await Promise.all([result.current.load(), result.current.load()]);
      });
      expect(created[0]!.setup).toHaveBeenCalledTimes(1);
      expect(result.current.status).toBe('ready');
    });

    it('run() while idle loads once, then runs the query', async () => {
      const { factory, created } = fakeFactory();
      const { result } = renderHook(() => useLabEngine(lab, item, { autoLoad: false, createEngine: factory, progress: progress() }));
      await act(async () => {
        await result.current.run('SELECT 1');
      });
      expect(created[0]!.setup).toHaveBeenCalledTimes(1);
      expect(created[0]!.run).toHaveBeenCalledWith('SELECT 1');
      expect(result.current.status).toBe('ready');
      expect(result.current.result?.ok).toBe(true);
    });

    it('shares one setup between two concurrent run() calls while idle', async () => {
      const { factory, created } = fakeFactory();
      const { result } = renderHook(() => useLabEngine(lab, item, { autoLoad: false, createEngine: factory, progress: progress() }));
      await act(async () => {
        await Promise.all([result.current.run('SELECT 1'), result.current.run('SELECT 1')]);
      });
      expect(created[0]!.setup).toHaveBeenCalledTimes(1);
      expect(created[0]!.run).toHaveBeenCalledTimes(2);
      expect(result.current.status).toBe('ready');
    });

    it('retry() after a failed deferred load loads again and ends ready', async () => {
      const { factory, created } = fakeFactory();
      const { result } = renderHook(() => useLabEngine(lab, item, { autoLoad: false, createEngine: factory, progress: progress() }));
      (created[0]!.setup as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('boot failed'));
      await act(async () => {
        await result.current.load();
      });
      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('boot failed');
      act(() => result.current.retry());
      await waitFor(() => expect(result.current.status).toBe('ready'));
      expect(created[0]!.setup).toHaveBeenCalledTimes(2);
      expect(result.current.error).toBeUndefined();
      expect(result.current.schema).toEqual({ tables: [], relationships: [] });
    });

    it('drops a pending load when the item changes and stays idle', async () => {
      const { factory, created } = fakeFactory();
      let release!: () => void;
      const { result, rerender } = renderHook(
        ({ it }) => useLabEngine(lab2, it, { autoLoad: false, createEngine: factory, progress: progress() }),
        { initialProps: { it: item } },
      );
      (created[0]!.setup as ReturnType<typeof vi.fn>).mockImplementationOnce(
        () => new Promise<void>((resolve) => { release = resolve; }),
      );
      let pending!: Promise<void>;
      act(() => {
        pending = result.current.load();
      });
      expect(result.current.status).toBe('loading');
      rerender({ it: item2 });
      expect(result.current.status).toBe('idle');
      await act(async () => {
        release();
        await pending;
      });
      expect(result.current.status).toBe('idle');
      expect(result.current.schema).toBeUndefined();
    });
  });
});
