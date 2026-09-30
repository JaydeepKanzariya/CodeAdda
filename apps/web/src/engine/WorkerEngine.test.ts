import { describe, expect, it, vi } from 'vitest';
import type { Dataset } from '@codeadda/core';
import type { WorkerRequest } from './protocol';
import { WorkerEngine } from './WorkerEngine';

const HANG = Symbol('hang');
type Handler = (req: WorkerRequest) => unknown;

class FakeWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  terminated = false;
  received: WorkerRequest[] = [];
  constructor(private handle: Handler) {}
  postMessage(req: WorkerRequest) {
    this.received.push(req);
    const out = this.handle(req);
    if (out === HANG) return;
    queueMicrotask(() =>
      this.onmessage?.({
        data: out instanceof Error ? { id: req.id, ok: false, error: out.message } : { id: req.id, ok: true, value: out },
      } as MessageEvent),
    );
  }
  terminate() {
    this.terminated = true;
  }
}

function setup(handler: Handler) {
  const workers: FakeWorker[] = [];
  const engine = new WorkerEngine(() => {
    const w = new FakeWorker(handler);
    workers.push(w);
    return w as unknown as Worker;
  }, 'sql', 50);
  return { engine, workers };
}

const ds: Dataset = { name: 'shop', source: 'CREATE TABLE t (n int);' };
const okResult = { ok: true, columns: ['n'], rows: [[1]], rowCount: 1, durationMs: 1 };

describe('WorkerEngine', () => {
  it('forwards calls and returns the worker result', async () => {
    const { engine, workers } = setup((req) => (req.method === 'run' ? okResult : undefined));
    await engine.setup(ds);
    expect(await engine.run('SELECT 1')).toEqual(okResult);
    expect(workers[0]!.received.map((r) => r.method)).toEqual(['setup', 'run']);
  });

  it('times out a hanging query, restarts the worker and replays setup', async () => {
    const { engine, workers } = setup((req) => (req.method === 'run' && req.args[0] === 'LOOP' ? HANG : req.method === 'run' ? okResult : undefined));
    await engine.setup(ds);
    const r = await engine.run('LOOP');
    expect(r).toEqual({ ok: false, error: { message: 'Query timed out after 0.05 seconds. The database was reset to the lesson data.' } });
    expect(workers[0]!.terminated).toBe(true);
    expect(workers).toHaveLength(2);
    expect(workers[1]!.received[0]).toMatchObject({ method: 'setup', args: [ds] });
    expect(await engine.run('SELECT 1')).toEqual(okResult);
  });

  it('rejects when the worker reports an error', async () => {
    const { engine } = setup((req) => (req.method === 'describe' ? new Error('catalog broken') : undefined));
    await expect(engine.describe()).rejects.toThrow('catalog broken');
  });

  it('rejects pending calls when the worker crashes', async () => {
    const { engine, workers } = setup(() => HANG);
    const pending = engine.describe();
    workers[0]!.onerror?.({ message: 'boom' } as ErrorEvent);
    await expect(pending).rejects.toThrow('boom');
  });

  it('leaves no pending timer when the worker crashes mid-run', async () => {
    vi.useFakeTimers();
    try {
      const { engine, workers } = setup(() => HANG);
      const pending = engine.run('SELECT 1');
      workers[0]!.onerror?.({ message: 'boom' } as ErrorEvent);
      await expect(pending).rejects.toThrow('boom');
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('resolves with a restore-failure message when the replayed setup rejects', async () => {
    let setupCalls = 0;
    const { engine } = setup((req) => {
      if (req.method === 'setup') {
        setupCalls += 1;
        return setupCalls === 1 ? undefined : new Error('disk full');
      }
      if (req.method === 'run' && req.args[0] === 'LOOP') return HANG;
      return okResult;
    });
    await engine.setup(ds);
    const r = await engine.run('LOOP');
    expect(r).toEqual({
      ok: false,
      error: {
        message: 'Query timed out after 0.05 seconds, and the database could not be restored: disk full',
      },
    });
  });
});
