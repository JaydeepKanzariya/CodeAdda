import type { Engine, LabLanguage } from '@codeadda/core';
import { MongoSimEngine } from '@codeadda/engine-mongo-sim';
import { PgliteEngine } from '@codeadda/engine-pglite';
import { RedisSimEngine } from '@codeadda/engine-redis-sim';

export function engineFor(language: LabLanguage): Engine | undefined {
  if (language === 'sql') return new PgliteEngine();
  if (language === 'mongodb') return new MongoSimEngine();
  if (language === 'redis') return new RedisSimEngine();
  return undefined;
}
