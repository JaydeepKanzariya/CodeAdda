import type { Engine, LabLanguage } from '@codeadda/core';
import { MongoSimEngine } from '@codeadda/engine-mongo-sim';
import { PgliteEngine } from '@codeadda/engine-pglite';

export function engineFor(language: LabLanguage): Engine | undefined {
  if (language === 'sql') return new PgliteEngine();
  if (language === 'mongodb') return new MongoSimEngine();
  return undefined;
}
