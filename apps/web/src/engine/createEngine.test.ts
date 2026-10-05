import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEngine } from './createEngine';

const spawned: MockWorker[] = [];

class MockWorker {
  url: string;
  options?: WorkerOptions;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  constructor(url: string | URL, options?: WorkerOptions) {
    this.url = url.toString();
    this.options = options;
    spawned.push(this);
  }
  postMessage() {}
  terminate() {}
}

describe('createEngine', () => {
  afterEach(() => {
    spawned.length = 0;
    vi.unstubAllGlobals();
  });

  it('spawns engine.worker.ts for sql', () => {
    vi.stubGlobal('Worker', MockWorker);
    const engine = createEngine('sql');
    expect(engine.kind).toBe('sql');
    expect(spawned[0]?.url).toMatch(/engine\.worker\.ts$/);
  });

  it('spawns mongo.worker.ts for mongodb', () => {
    vi.stubGlobal('Worker', MockWorker);
    const engine = createEngine('mongodb');
    expect(engine.kind).toBe('mongodb');
    expect(spawned[0]?.url).toMatch(/mongo\.worker\.ts$/);
  });

  it('throws for redis', () => {
    expect(() => createEngine('redis')).toThrow(/No engine available for redis/);
  });
});
