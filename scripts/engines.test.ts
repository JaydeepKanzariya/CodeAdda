import { describe, expect, it } from 'vitest';
import { engineFor } from './engines';
import { PgliteEngine } from '@codeadda/engine-pglite';
import { MongoSimEngine } from '@codeadda/engine-mongo-sim';

describe('engineFor', () => {
  it('returns PgliteEngine for sql', () => {
    expect(engineFor('sql')).toBeInstanceOf(PgliteEngine);
  });

  it('returns MongoSimEngine for mongodb', () => {
    expect(engineFor('mongodb')).toBeInstanceOf(MongoSimEngine);
  });

  it('returns undefined for redis', () => {
    expect(engineFor('redis')).toBeUndefined();
  });
});
