import { describe, expect, it } from 'vitest';
import type { QueryResult } from '@codeadda/core';
import { RedisSimEngine } from './RedisSimEngine';

const seed = ['SETBIT a 1 1', 'SETBIT a 3 1', 'SETBIT b 3 1', 'SETBIT b 12 1', 'SET n 10', 'HSET h price 4.5 qty 2'].join('\n');
const setup = async () => {
  const e = new RedisSimEngine();
  await e.setup({ name: 'bits', source: seed });
  return e;
};
const ok = (r: QueryResult) => {
  if (!r.ok) throw new Error(r.error.message);
  return r;
};

describe('BITOP and BITCOUNT ranges', () => {
  it('AND, OR and XOR store the result and return its length in bytes', async () => {
    const e = await setup();
    expect(ok(await e.run('BITOP AND d a b')).rows).toEqual([['BITOP', 2]]);
    expect(ok(await e.run('BITCOUNT d')).rows).toEqual([['BITCOUNT', 1]]);
    expect(ok(await e.run('BITOP OR d a b\nBITCOUNT d')).rows).toEqual([['BITCOUNT', 3]]);
    expect(ok(await e.run('BITOP XOR d a b\nBITCOUNT d')).rows).toEqual([['BITCOUNT', 2]]);
    expect(ok(await e.run('BITOP AND d a b\nGETBIT d 3')).rows).toEqual([['GETBIT', 1]]);
  });

  it('treats a missing key as all zeros and pads shorter inputs', async () => {
    const e = await setup();
    expect(ok(await e.run('BITOP AND d a missing\nBITCOUNT d')).rows).toEqual([['BITCOUNT', 0]]);
    expect(ok(await e.run('BITOP OR d a missing\nBITCOUNT d')).rows).toEqual([['BITCOUNT', 2]]);
  });

  it('NOT takes exactly one source and flips every bit of it', async () => {
    const e = await setup();
    expect(ok(await e.run('BITOP NOT d a\nBITCOUNT d')).rows).toEqual([['BITCOUNT', 6]]);
    expect((await e.run('BITOP NOT d a b')).ok).toBe(false);
  });

  it('rejects an unknown operation and a non-string source', async () => {
    const e = await setup();
    expect(await e.run('BITOP NAND d a b')).toMatchObject({ ok: false, error: { message: expect.stringMatching(/syntax error/) } });
    expect(await e.run('BITOP AND d a h')).toMatchObject({ ok: false, error: { message: expect.stringMatching(/^WRONGTYPE/) } });
  });

  it('BITCOUNT start end counts a byte range, with negative indexes from the end', async () => {
    const e = await setup();
    expect(ok(await e.run('BITCOUNT b 0 0')).rows).toEqual([['BITCOUNT', 1]]);
    expect(ok(await e.run('BITCOUNT b 1 1')).rows).toEqual([['BITCOUNT', 1]]);
    expect(ok(await e.run('BITCOUNT b -1 -1')).rows).toEqual([['BITCOUNT', 1]]);
    expect(ok(await e.run('BITCOUNT b 5 9')).rows).toEqual([['BITCOUNT', 0]]);
  });
});

describe('integer counters', () => {
  it('INCR, DECR, INCRBY, DECRBY and HINCRBY reply with integers, like redis-cli', async () => {
    const e = await setup();
    const r = ok(await e.run('INCR n\nDECR n\nINCRBY n 5\nDECRBY n 2\nHINCRBY h qty 3'));
    expect(r.rows).toEqual([['HINCRBY', 5]]);
    expect(r.documents).toEqual([
      'redis> INCR n\n(integer) 11',
      'redis> DECR n\n(integer) 10',
      'redis> INCRBY n 5\n(integer) 15',
      'redis> DECRBY n 2\n(integer) 13',
      'redis> HINCRBY h qty 3\n(integer) 5',
    ]);
  });

  it('gives the real Redis errors for non-integer increments and fields', async () => {
    const e = await setup();
    expect(await e.run('INCRBY n 1.5')).toMatchObject({ ok: false, error: { message: expect.stringMatching(/^ERR value is not an integer or out of range/) } });
    expect(await e.run('HINCRBY h price 1')).toMatchObject({ ok: false, error: { message: expect.stringMatching(/^ERR hash value is not an integer/) } });
    expect(await e.run('HINCRBY h qty 1.5')).toMatchObject({ ok: false, error: { message: expect.stringMatching(/^ERR value is not an integer or out of range/) } });
  });
});

describe('set stores, ranks and bitmap lengths', () => {
  const fresh = async () => {
    const e = new RedisSimEngine();
    await e.setup({ name: 's', source: 'SADD a 1 2 3\nSADD b 2 3 4\nZADD z 10 x 20 y 20 w\nSETBIT bm 3 1\nSETBIT bm 12 1' });
    return e;
  };
  const rows = async (e: RedisSimEngine, q: string) => ok(await e.run(q)).rows;

  it('SINTERSTORE, SUNIONSTORE and SDIFFSTORE read only the source keys and store the result', async () => {
    const e = await fresh();
    expect(await rows(e, 'SINTERSTORE dst a b')).toEqual([['SINTERSTORE', 2]]);
    expect(await rows(e, 'SMEMBERS dst')).toEqual([['2'], ['3']]);
    expect(await rows(e, 'SUNIONSTORE dst a b\nSCARD dst')).toEqual([['SCARD', 4]]);
    expect(await rows(e, 'SDIFFSTORE dst a b\nSMEMBERS dst')).toEqual([['1']]);
  });

  it('a *STORE with an empty result deletes the destination', async () => {
    const e = await fresh();
    expect(await rows(e, 'SADD dst old\nSINTERSTORE dst a missing\nEXISTS dst')).toEqual([['EXISTS', 0]]);
  });

  it('ZRANK and ZREVRANK give the 0-based rank, nil for a missing member', async () => {
    const e = await fresh();
    expect(await rows(e, 'ZRANK z x')).toEqual([['ZRANK', 0]]);
    expect(await rows(e, 'ZRANK z y')).toEqual([['ZRANK', 2]]);
    expect(await rows(e, 'ZREVRANK z y')).toEqual([['ZREVRANK', 0]]);
    expect(await rows(e, 'ZRANK z nobody')).toEqual([['ZRANK', null]]);
  });

  it('BITCOUNT … BIT counts a bit range; STRLEN of a bitmap is its byte length', async () => {
    const e = await fresh();
    expect(await rows(e, 'BITCOUNT bm 0 7 BIT')).toEqual([['BITCOUNT', 1]]);
    expect(await rows(e, 'BITCOUNT bm 4 15 BIT')).toEqual([['BITCOUNT', 1]]);
    expect(await rows(e, 'BITCOUNT bm 0 0 BYTE')).toEqual([['BITCOUNT', 1]]);
    expect(await rows(e, 'STRLEN bm')).toEqual([['STRLEN', 2]]);
  });
});
