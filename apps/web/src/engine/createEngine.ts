import type { Engine, LabLanguage } from '@codeadda/core';
import { WorkerEngine } from './WorkerEngine';

export function createEngine(language: LabLanguage): Engine {
  if (language === 'sql') {
    return new WorkerEngine(() => new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' }), 'sql');
  }
  throw new Error(`No engine available for ${language} labs yet.`);
}
