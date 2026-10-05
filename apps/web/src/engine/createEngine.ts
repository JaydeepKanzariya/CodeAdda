import type { Engine, LabLanguage } from '@codeadda/core';
import { WorkerEngine } from './WorkerEngine';

// One worker per engine, so a lab only downloads its own engine.
const WORKERS: Partial<Record<LabLanguage, () => Worker>> = {
  sql: () => new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' }),
  mongodb: () => new Worker(new URL('./mongo.worker.ts', import.meta.url), { type: 'module' }),
};

export function createEngine(language: LabLanguage): Engine {
  const spawn = WORKERS[language];
  if (!spawn) throw new Error(`No engine available for ${language} labs yet.`);
  return new WorkerEngine(spawn, language);
}

