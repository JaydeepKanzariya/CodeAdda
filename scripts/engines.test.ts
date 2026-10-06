import { describe, expect, it } from 'vitest';
import { engineFor } from './engines';
import { PgliteEngine } from '@codeadda/engine-pglite';
import { MongoSimEngine } from '@codeadda/engine-mongo-sim';
import { RedisSimEngine } from '@codeadda/engine-redis-sim';

describe('engineFor', () => {
  it('returns PgliteEngine for sql', () => {
    expect(engineFor('sql')).toBeInstanceOf(PgliteEngine);
  });

  it('returns MongoSimEngine for mongodb', () => {
    expect(engineFor('mongodb')).toBeInstanceOf(MongoSimEngine);
  });

  it('returns RedisSimEngine for redis', () => {
    expect(engineFor('redis')).toBeInstanceOf(RedisSimEngine);
  });
});
