import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { grade, resolveDataset } from '@codeadda/core';
import { loadLabFromDir } from '@codeadda/content-loader/node';
import { RedisSimEngine } from '@codeadda/engine-redis-sim';

const lab = loadLabFromDir(resolve(import.meta.dirname, '../content/redis'));
const items = [...lab.lessons.flatMap((chapter) => chapter.items), ...lab.problems.flatMap((group) => group.items)];
const source = readFileSync(resolve(import.meta.dirname, '../content/redis/datasets/platform.redis'), 'utf8');
const item = (id: string) => {
  const found = items.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing Redis item ${id}`);
  return found;
};

const check = async (id: string, query: string) => {
  const engine = new RedisSimEngine();
  try {
    return await grade(engine, item(id), resolveDataset(lab, item(id)), query);
  } finally {
    await engine.dispose();
  }
};

describe('Redis answer checks', () => {
  it('pins every state item to a real state change', async () => {
    const stateItems = items.filter((candidate) => candidate.check === 'state');
    expect(stateItems.length).toBe(40);
    for (const candidate of stateItems) {
      for (const noOp of ['PING', 'EXISTS nope', 'FLUSHDB']) {
        const engine = new RedisSimEngine();
        try {
          expect((await grade(engine, candidate, resolveDataset(lab, candidate), noOp)).pass, `${candidate.id}: ${noOp}`).toBe(false);
        } finally {
          await engine.dispose();
        }
      }
    }
  });

  it('requires specific snapshot checks for state items', () => {
    for (const candidate of items.filter((entry) => entry.check === 'state')) {
      expect(candidate.checkQuery?.startsWith('SNAPSHOT '), candidate.id).toBe(true);
      expect(candidate.checkQuery, candidate.id).not.toBe('SNAPSHOT *');
    }
  });

  it('accepts the documented equivalent Redis forms', async () => {
    expect((await check('set-options', 'SET otp:user:102 482913 NX EX 300')).pass).toBe(true);
    expect((await check('hset-hget', 'HMSET user:113 name "Mira Okafor" tier pro country IN xp 250')).pass).toBe(true);
    expect((await check('range-by-rank', 'ZREVRANGE leaderboard:global 0 4 WITHSCORES')).pass).toBe(true);
    expect((await check('set-maths', 'SINTER tags:user:102 tags:user:101')).pass).toBe(true);
  });

  it('rejects look-alike answers and missing expiry', async () => {
    expect((await check('naming-type', 'EXISTS leaderboard:global')).pass).toBe(false);
    expect((await check('setbit-bitcount', 'GETBIT active:2026-01-03 101')).pass).toBe(false);
    expect((await check('session-with-expiry', 'SET session:challenge 101')).pass).toBe(false);
  });

  it('keeps the source dataset available for real-engine checks', () => {
    expect(source).toContain('XGROUP CREATE events:matches scorers 0');
    expect(source).toContain('CONFIG SET maxmemory-policy noeviction');
  });

  it('documents the values produced by every problem solution', () => {
    const expected = new Map([
      ['session-with-expiry', ['session:113', 'user-113', '1800']],
      ['page-view-counter', ['13', '22']],
      ['profile-update', ['Mira Okafor', 'pro', '50']],
      ['shared-interests', ['racing']],
      ['capped-activity-feed', ['event:launch:113']],
      ['weekly-podium', ['alpha 100', 'beta 90', 'gamma 90']],
      ['mutual-friends-online', ['2, 3']],
      ['sliding-window-limiter', ['req5', '1767225600000']],
      ['merged-leaderboard', ['bob 26', 'alice 14']],
    ]);
    for (const problem of lab.problems.flatMap((group) => group.items)) {
      const example = problem.example ?? '';
      for (const value of expected.get(problem.id) ?? []) {
        expect(example, `${problem.id} example is missing ${value}`).toContain(value);
      }
    }
  });

  it('uses real, delivered stream IDs for worker recovery', () => {
    const recovery = item('stream-worker-recovery');
    expect(recovery.setup).toContain('XADD events:matches 1-0');
    expect(recovery.setup).toContain('XADD events:matches 1-1');
    expect(recovery.solution).toContain('XACK events:matches scorers 1-0');
    expect(recovery.solution).not.toContain('XGROUP CREATE');
  });

  it('grades both leaderboard problems as ordered rows', () => {
    for (const id of ['weekly-podium', 'merged-leaderboard']) {
      expect(item(id).check, id).toBe('rows-ordered');
    }
  });
});
