import type { Dataset, Engine, LabLanguage, QueryResult, RunOptions, SchemaInfo } from '@codeadda/core';
import type { EngineMethod, WorkerResponse } from './protocol';

interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
}

export class WorkerEngine implements Engine {
  readonly mode = 'browser' as const;
  private worker: Worker;
  private pending = new Map<number, Pending>();
  private seq = 0;
  private dataset?: Dataset;

  constructor(
    private spawn: () => Worker,
    readonly kind: LabLanguage,
    private defaultTimeoutMs = 5000,
  ) {
    this.worker = this.start();
  }

  private start(): Worker {
    const w = this.spawn();
    w.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const res = e.data;
      const p = this.pending.get(res.id);
      if (!p) return;
      this.pending.delete(res.id);
      if (res.ok) p.resolve(res.value);
      else p.reject(new Error(res.error));
    };
    w.onerror = (e: ErrorEvent) => this.rejectAll(new Error(e.message || 'The database engine failed to start.'));
    return w;
  }

  private rejectAll(err: Error) {
    for (const p of this.pending.values()) p.reject(err);
    this.pending.clear();
  }

  private call<T>(method: EngineMethod, args: unknown[] = []): Promise<T> {
    const id = ++this.seq;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.worker.postMessage({ id, method, args });
    });
  }

  private async restart(): Promise<void> {
    this.worker.terminate();
    this.rejectAll(new Error('The database engine was restarted.'));
    this.worker = this.start();
    if (this.dataset) await this.call('setup', [this.dataset]);
  }

  async setup(dataset: Dataset): Promise<void> {
    this.dataset = dataset;
    await this.call('setup', [dataset]);
  }

  async run(query: string, opts?: RunOptions): Promise<QueryResult> {
    const ms = opts?.timeoutMs ?? this.defaultTimeoutMs;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), ms);
    });
    let outcome: QueryResult | 'timeout';
    try {
      outcome = await Promise.race([this.call<QueryResult>('run', [query]), timeout]);
    } finally {
      clearTimeout(timer);
    }
    if (outcome === 'timeout') {
      try {
        await this.restart();
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        return {
          ok: false,
          error: {
            message: `Query timed out after ${ms / 1000} seconds, and the database could not be restored: ${reason}`,
          },
        };
      }
      return {
        ok: false,
        error: { message: `Query timed out after ${ms / 1000} seconds. The database was reset to the lesson data.` },
      };
    }
    return outcome;
  }

  reset(): Promise<void> {
    return this.call('reset');
  }

  snapshot(query: string): Promise<QueryResult> {
    return this.run(query);
  }

  describe(): Promise<SchemaInfo> {
    return this.call('describe');
  }

  async dispose(): Promise<void> {
    this.worker.terminate();
    this.rejectAll(new Error('The database engine was closed.'));
  }
}
