import type { Engine } from '@codeadda/core';
import type { WorkerRequest, WorkerResponse } from './protocol';

export function serveEngine(engine: Engine): void {
  self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
    const { id, method, args } = e.data;
    let response: WorkerResponse;
    try {
      const fn = engine[method] as unknown as (...a: unknown[]) => Promise<unknown>;
      response = { id, ok: true, value: await fn.apply(engine, args) };
    } catch (err) {
      response = { id, ok: false, error: err instanceof Error ? err.message : String(err) };
    }
    self.postMessage(response);
  };
}
