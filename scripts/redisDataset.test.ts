import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { RedisSimEngine } from '@codeadda/engine-redis-sim';

const source = readFileSync(resolve(import.meta.dirname, '../content/redis/datasets/platform.redis'), 'utf8');

describe('ArcadePulse Redis dataset', () => {
  const e = new RedisSimEngine();

  afterEach(() => e.dispose());

  async function run(query: string) {
    const result = await e.run(query);
    if (!result.ok) throw new Error(`${query}: ${result.error.message}`);
    return result;
  }

  it('contains the profile, catalog, counters, sessions, and cache facts', async () => {
    await e.setup({ name: 'platform', source });

    expect((await run('SCAN 0 MATCH user:* COUNT 100')).rows).toHaveLength(12);
    expect((await run('HGET user:112 country')).rows[0]?.[1]).toBe(null);
    expect((await run('HGET user:101 name')).rows[0]?.[1]).toBe('Amina Rao');
    expect((await run('SCAN 0 MATCH game:* COUNT 100')).rows).toHaveLength(8);
    expect((await run('GET views:total')).rows[0]?.[1]).toBe('1790');
    expect((await run('GET revenue:day:2026-01-01')).rows[0]?.[1]).toBe('1499.5');
    for (const [game, views] of Object.entries({
      1: '120',
      2: '230',
      3: '95',
      4: '410',
      5: '180',
      6: '75',
      7: '520',
      8: '160',
    }))
      expect((await run(`GET views:game:${game}`)).rows[0]?.[1]).toBe(views);
    expect((await run('TTL session:alpha')).rows[0]?.[1]).toBe(120);
    expect((await run('TTL session:beta')).rows[0]?.[1]).toBe(1800);
    expect((await run('TTL session:gamma')).rows[0]?.[1]).toBe(3600);
    expect((await run('TTL session:delta')).rows[0]?.[1]).toBe(86400);
    expect((await run('TTL session:orphan')).rows[0]?.[1]).toBe(-1);
    expect((await run('TTL session:legacy')).rows[0]?.[1]).toBe(-1);
    expect((await run('TTL cache:game:3')).rows[0]?.[1]).toBe(300);
    expect((await run('TTL cache:featured')).rows[0]?.[1]).toBe(-1);
    expect((await run('EXISTS session:guest_99')).rows[0]?.[1]).toBe(1);
  });

  it('contains the list, set, sorted-set, and checkout facts', async () => {
    await e.setup({ name: 'platform', source });

    expect((await run('LLEN feed:101')).rows[0]?.[1]).toBe(12);
    expect((await run('LLEN queue:emails')).rows[0]?.[1]).toBe(5);
    expect((await run('LLEN queue:emails:processing')).rows[0]?.[1]).toBe(0);
    expect((await run('SINTERCARD 2 friends:101 friends:102')).rows[0]?.[1]).toBe(3);
    expect((await run('SCARD online:users')).rows[0]?.[1]).toBe(6);
    expect((await run('SCARD tags:user:101')).rows[0]?.[1]).toBe(3);
    expect((await run('SCARD tags:user:106')).rows[0]?.[1]).toBe(2);
    expect((await run('ZCARD leaderboard:global')).rows[0]?.[1]).toBe(12);
    expect((await run('ZCOUNT leaderboard:global 760 760')).rows[0]?.[1]).toBe(2);
    expect((await run('ZCARD leaderboard:week:2026-01')).rows[0]?.[1]).toBe(8);
    expect((await run('ZCARD bonus:week:2026-01')).rows[0]?.[1]).toBe(5);
    expect((await run('GET wallet:101')).rows[0]?.[1]).toBe('500');
    expect((await run('GET wallet:102')).rows[0]?.[1]).toBe('120');
    expect((await run('HGET stock:item:7 stock')).rows[0]?.[1]).toBe('9');
    expect((await run('HGET stock:item:7 price')).rows[0]?.[1]).toBe('39.99');
  });

  it('contains the bitmap, HyperLogLog, stream, rate-limit, and config facts', async () => {
    await e.setup({ name: 'platform', source });

    expect((await run('SCAN 0 MATCH active:* COUNT 100')).rows).toHaveLength(7);
    expect((await run('BITCOUNT active:2026-01-01')).rows[0]?.[1]).toBe(4);
    expect((await run('BITCOUNT active:2026-01-07')).rows[0]?.[1]).toBe(3);
    expect((await run('PFCOUNT visitors:2026-01-01')).rows[0]?.[1]).toBe(5);
    expect((await run('PFCOUNT visitors:2026-01-02')).rows[0]?.[1]).toBe(4);
    expect((await run('PFCOUNT visitors:2026-01-01 visitors:2026-01-02')).rows[0]?.[1]).toBe(7);
    expect((await run('XLEN events:matches')).rows[0]?.[1]).toBe(10);
    expect((await run('XPENDING events:matches scorers')).rows[0]?.[0]).toBe(4);
    expect((await run('ZCARD ratelimit:api:101')).rows[0]?.[1]).toBe(4);
    expect((await run('CONFIG GET maxmemory-policy')).rows[0]?.[0]).toBe('maxmemory-policy');
    expect((await run('CONFIG GET maxmemory-policy')).rows[0]?.[1]).toBe('noeviction');
  });
});
