export type EngineMethod = 'setup' | 'run' | 'reset' | 'snapshot' | 'describe' | 'dispose';

export interface WorkerRequest {
  id: number;
  method: EngineMethod;
  args: unknown[];
}

export type WorkerResponse = { id: number; ok: true; value: unknown } | { id: number; ok: false; error: string };
