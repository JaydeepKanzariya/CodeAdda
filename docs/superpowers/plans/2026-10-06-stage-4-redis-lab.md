# Stage 4: Redis Lab — Implementation Plan (v2)

> **For agentic workers:** implement task by task, in order (1 → 16). Code tasks are test-first: write the test, run it and see it fail for the expected reason, implement, run it and see it pass. Steps use `- [ ]`.

**Goal:** A self-contained, offline Redis lab at `/redis` that takes a learner from zero to industry-standard Redis 7: 15 chapters, 45 lessons (13 animated), 12 problems, on the fictional "ArcadePulse" gaming-platform dataset, powered by a new dependency-free engine `@codeadda/engine-redis-sim`.

**Architecture:** New package `@codeadda/engine-redis-sim` (tokenizer → command table → typed store → reply formatter) implements the existing `Engine` interface. The web app gets one more worker in the per-language map; `labUi('redis')` holds every Redis label; the results panel gains a "Transcript" view. Content lives in `content/redis/` and flows through the existing lazy content plugin unchanged (the loader already accepts `datasets/*.redis`). `check-content` picks the engine with `engineFor('redis')`.

**Spec (binding):** `docs/superpowers/specs/2026-10-06-stage-4-redis-lab-design.md` (v2). Where this plan and the spec disagree, the spec wins.

## Global Constraints
- **No git commits, adds, stashes, pushes or branch changes.** Stay on `feature/stage-4-redis-lab`.
- **Zero new npm dependencies.** The engine is plain TypeScript.
- Don't touch `content/sql/**`, `content/postgres/**`, `content/mongodb/**`, `packages/engine-pglite/**` or `packages/engine-mongo-sim/**`.
- No `dark:` utilities, no raw hex outside `apps/web/src/styles/tokens.css`, no external URLs (e2e aborts non-localhost requests).
- Content is original and fictional; no "Chai".
- The home entry bundle stays ≤ 295 kB; the Redis engine and content load only on `/redis`.
- A dev server on 5173 may belong to the owner — never stop it; use 5197 for anything you start; **don't edit files while `npm run e2e` runs**.
- Verify with: `npm run typecheck`, `npx vitest run <files>`, `npm test`, `npm run check-content`, `npm run e2e`, `npm run build -w @codeadda/web`.

## Review Focus
1. **Write lessons can't be faked:** `PING`, `EXISTS nope` and `FLUSHDB` fail every `state` item; a missing TTL fails. Pinned in Task 15 (`redisChecks.test.ts`).
2. **Look-alike answers fail:** single-value replies carry the command name. Pinned in Tasks 4 and 15.
3. **Equivalent answers pass:** `SET … EX` = `SETEX`; `HSET` many = `HMSET`; `ZRANGE … REV` = `ZREVRANGE`; any member order. Pinned in Task 15.
4. **Transactions are real:** `EXECABORT` on queue-time errors, no rollback on runtime errors, `WATCH` aborts. Pinned in Task 8.
5. **Determinism:** frozen clock, seeded PRNG, canonical replies; the same script always gives the same result. Pinned in Tasks 3–9.
6. **The other three labs are unchanged.** Pinned by their tests and the full e2e run.

---

### Task 1: Package skeleton and types

**Files:** Create `packages/engine-redis-sim/package.json`, `src/types.ts`, `src/index.ts`.

- [ ] `package.json`:
```json
{
  "name": "@codeadda/engine-redis-sim",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": { "@codeadda/core": "*" }
}
```
Run `npm install` at the root.
- [ ] `src/types.ts`:
```ts
export const NOW_MS = 1767225600000; // 2026-01-01T00:00:00Z — the lab's frozen clock

export type RedisType = 'string' | 'hash' | 'list' | 'set' | 'zset' | 'stream';
export interface StreamEntry { id: string; fields: string[] } // flat field/value pairs, insertion order
export interface StreamGroup { lastDelivered: string; pending: Map<string, { consumer: string; deliveries: number }> }
export interface StreamValue { entries: StreamEntry[]; lastId: string; groups: Map<string, StreamGroup> }
export type StringValue = { kind: 'text'; text: string } | { kind: 'bits'; bytes: Uint8Array } | { kind: 'hll'; members: Set<string> };
export type EntryValue = StringValue | Map<string, string> | string[] | Set<string> | Map<string, number> | StreamValue;
export interface Entry { type: RedisType; value: EntryValue; expiresAt?: number }

export type Reply =
  | { t: 'status'; v: string }
  | { t: 'error'; v: string }
  | { t: 'int'; v: number }
  | { t: 'bulk'; v: string | null }
  | { t: 'array'; v: Reply[] | null };

/** How the last reply becomes a table (spec §3.3). */
export type Shape = 'scalar' | 'values' | 'unordered' | 'hvals' | 'pairs' | 'scored' | 'scan' | 'stream' | 'xread' | 'xpending' | 'exec';

export class RedisError extends Error {} // message is the real Redis text, e.g. "WRONGTYPE Operation against …"
```
- [ ] `src/index.ts`: `export * from './types';` (engine export added in Task 4).
- [ ] `npm run typecheck` clean.

---

### Task 2: Tokenizer

**Files:** Create `src/tokenize.ts`, `src/tokenize.test.ts`.

- [ ] **Failing tests:**
```ts
import { describe, expect, it } from 'vitest';
import { RedisSyntaxError, tokenize } from './tokenize';

describe('tokenize', () => {
  it('splits lines into commands, skipping blank lines and # comments', () => {
    expect(tokenize('# seed\nSET user:1 "Asha Rao"\n\n  get user:1  ')).toEqual([
      { line: 2, args: ['SET', 'user:1', 'Asha Rao'] },
      { line: 4, args: ['get', 'user:1'] },
    ]);
  });
  it('keeps # inside an argument as data', () => {
    expect(tokenize('SADD tags tag#1')[0]!.args).toEqual(['SADD', 'tags', 'tag#1']);
  });
  it('handles double-quote escapes and single quotes like redis-cli', () => {
    expect(tokenize(String.raw`SET k "a\"b\n\x41"`)[0]!.args[2]).toBe('a"b\nA');
    expect(tokenize(String.raw`SET k 'it\'s \n'`)[0]!.args[2]).toBe("it's \\n");
    expect(tokenize('SET k ""')[0]!.args[2]).toBe('');
  });
  it('reports unbalanced quotes and text glued to a closing quote with line and column', () => {
    expect(() => tokenize('GET a\nSET k "open')).toThrow(RedisSyntaxError);
    try { tokenize('SET k "a"b'); } catch (e) {
      expect(e).toMatchObject({ line: 1, column: 10 }); // the character glued to the closing quote
      expect((e as Error).message).toMatch(/closing quote must be followed by a space/);
    }
  });
});
```
- [ ] **Implement** `src/tokenize.ts`:
```ts
export interface Command { line: number; args: string[] }

export class RedisSyntaxError extends Error {
  constructor(message: string, readonly line: number, readonly column: number) { super(`${message} (line ${line}, column ${column})`); }
}

const ESC: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', a: '\x07', '"': '"', '\\': '\\' };

export function tokenize(script: string): Command[] {
  const out: Command[] = [];
  script.split(/\r?\n/).forEach((text, i) => {
    const line = i + 1;
    if (/^\s*(#|$)/.test(text)) return;
    const args: string[] = [];
    let p = 0;
    while (p < text.length) {
      while (p < text.length && /\s/.test(text[p]!)) p++;
      if (p >= text.length) break;
      const start = p;
      let arg = '';
      const q = text[p];
      if (q === '"' || q === "'") {
        p++;
        let closed = false;
        while (p < text.length) {
          const c = text[p++]!;
          if (c === q) { closed = true; break; }
          if (c === '\\' && q === '"') {
            const e = text[p++] ?? '';
            if (e === 'x' && /^[0-9a-fA-F]{2}$/.test(text.slice(p, p + 2))) { arg += String.fromCharCode(parseInt(text.slice(p, p + 2), 16)); p += 2; }
            else arg += ESC[e] ?? e;
          } else if (c === '\\' && q === "'" && text[p] === "'") { arg += "'"; p++; }
          else arg += c;
        }
        if (!closed) throw new RedisSyntaxError('Unbalanced quotes', line, start + 1);
        if (p < text.length && !/\s/.test(text[p]!)) throw new RedisSyntaxError('A closing quote must be followed by a space', line, p + 1);
      } else {
        while (p < text.length && !/\s/.test(text[p]!)) arg += text[p++];
      }
      args.push(arg);
    }
    out.push({ line, args });
  });
  return out;
}
```
Columns are 1-based throughout.
- [ ] Tests PASS.

---

### Task 3: Store helpers — clock, numbers, glob, PRNG

**Files:** Create `src/util.ts`, `src/util.test.ts`.

- [ ] **Failing tests** (`util.test.ts`): `formatFloat(0.1 + 0.2) === '0.3'`, `formatFloat(11) === '11'`, `formatFloat(1e21)` is a plain Redis-style string (`'1e+21'` acceptable, log it), `formatFloat(Infinity) === 'inf'`; `parseInteger('10')` → `10n`, `parseInteger('1.5')` and `parseInteger(' 1')` throw `ERR value is not an integer or out of range`; `addInteger(9223372036854775807n, 1n)` throws `ERR increment or decrement would overflow`; `parseFloatArg('abc')` throws `ERR value is not a valid float`; `globToRegExp('user:*').test('user:101')`, `globToRegExp('h?llo').test('hallo')`, `globToRegExp('h[^e]llo').test('hallo') && !…test('hello')`, `globToRegExp('a\\*').test('a*')`; `parseScoreBound('(5')` → `{ value: 5, exclusive: true }`, `'-inf'` → `-Infinity`; `mulberry32(1)` yields the same 3 numbers on two calls.
- [ ] **Implement** (`util.ts`):
```ts
import { RedisError } from './types';

const I64_MIN = -(2n ** 63n), I64_MAX = 2n ** 63n - 1n;

export function parseInteger(s: string): bigint {
  if (!/^-?\d+$/.test(s)) throw new RedisError('ERR value is not an integer or out of range');
  const n = BigInt(s);
  if (n < I64_MIN || n > I64_MAX) throw new RedisError('ERR value is not an integer or out of range');
  return n;
}
export function addInteger(a: bigint, b: bigint): bigint {
  const r = a + b;
  if (r < I64_MIN || r > I64_MAX) throw new RedisError('ERR increment or decrement would overflow');
  return r;
}
export function parseFloatArg(s: string): number {
  const v = s === 'inf' || s === '+inf' ? Infinity : s === '-inf' ? -Infinity : Number(s);
  if (s.trim() === '' || Number.isNaN(v)) throw new RedisError('ERR value is not a valid float');
  return v;
}
/** Redis prints doubles with up to 17 digits of long double; 15 significant digits reproduces it for every lab value. */
export function formatFloat(v: number): string {
  if (v === Infinity) return 'inf';
  if (v === -Infinity) return '-inf';
  return String(Number(v.toPrecision(15)));
}
export function globToRegExp(glob: string): RegExp {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]!;
    if (c === '\\' && i + 1 < glob.length) re += glob[++i]!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    else if (c === '*') re += '.*';
    else if (c === '?') re += '.';
    else if (c === '[') {
      const end = glob.indexOf(']', i + 1);
      if (end === -1) re += '\\[';
      else { const body = glob.slice(i + 1, end); re += `[${body.startsWith('^') ? '^' + body.slice(1).replace(/\\/g, '\\\\') : body.replace(/\\/g, '\\\\')}]`; i = end; }
    } else re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`, 's');
}
export function parseScoreBound(s: string): { value: number; exclusive: boolean } {
  const exclusive = s.startsWith('(');
  const value = parseFloatArg(exclusive ? s.slice(1) : s);
  return { value, exclusive };
}
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const byteCompare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
```
- [ ] Tests PASS.

---

### Task 4: Engine core — keyspace, strings, counters, expiry, reply formatting

**Files:** Create `src/RedisSimEngine.ts`, `src/format.ts`, `src/commands/generic.ts`, `src/commands/strings.ts`, `src/RedisSimEngine.test.ts`; modify `src/index.ts`.

**Structure (binding):**
```ts
// commands/registry.ts
export interface Ctx { db: Keyspace; now: number; inSnapshot: boolean; rng: () => number }
export interface CommandSpec {
  name: string;                 // uppercase
  arity: number;                // Redis convention: n = exactly n args incl. name; -n = at least n
  flags: ('write' | 'read' | 'admin')[];
  run(ctx: Ctx, args: string[]): { reply: Reply; shape: Shape; notice?: string };
}
```
`Keyspace` wraps `Map<string, Entry>` and owns: `get(key, type?)` (lazy-checks expiry against the frozen clock — at `NOW_MS` nothing is past due unless set with a non-positive TTL, which deletes immediately — and throws `WRONGTYPE Operation against a key holding the wrong kind of value` on a type mismatch), `set`, `delete`, `keys()` (sorted), `touch(key)` (bumps a per-key version for `WATCH`), and `clone()` (deep copy for pristine/reset).

`RedisSimEngine.run(script)`:
1. `tokenize` (a `RedisSyntaxError` → `{ ok: false, error: { message, position } }` where `position` is the column and the message names the line).
2. For each command: look up the spec (uppercase name); unknown → `ERR unknown command 'foo', with args beginning with: 'a' 'b'`; blocked → its explanation (spec §2 table); arity mismatch → `ERR wrong number of arguments for 'get' command`. Outside `MULTI` the first error stops the script and returns `{ ok: false, error: { message: "<Redis error text> — line N" } }`; writes made by earlier lines stay (as in redis-cli).
3. Append each command and its redis-cli rendering to `documents` (`format.ts: renderCli(reply)` → `OK`, `(integer) 5`, `"text"`, `(nil)`, `1) "a"\n2) "b"`, `(empty array)`, `(error) …`).
4. Convert the **last** reply with `toTable(reply, shape, commandName)` (spec §3.3).

`snapshot(query)`: the same, with `ctx.inSnapshot = true`; a command flagged `write` → error `Checks can only read`; `SNAPSHOT` exists only in this mode (in `run()` it is an unknown command).

- [ ] **Failing tests** (excerpt — write all of these):
```ts
const seed = ['SET views:total 10', 'SET greeting hello', 'HSET user:1 name Asha', 'SET session:a 1 EX 120'].join('\n');
const setup = async () => { const e = new RedisSimEngine(); await e.setup({ name: 'p', source: seed }); return e; };
const ok = (r: QueryResult) => { if (!r.ok) throw new Error(r.error.message); return r; };

it('returns the last reply as a command/result row, with a transcript of every command', async () => {
  const r = ok(await (await setup()).run('SET a 1\nINCR a\nGET a'));
  expect(r.columns).toEqual(['command', 'result']);
  expect(r.rows).toEqual([['GET', '2']]);
  expect(r.documents).toEqual(['redis> SET a 1\nOK', 'redis> INCR a\n(integer) 2', 'redis> GET a\n"2"']);
});
it('formats floats like Redis and guards integer overflow', async () => {
  const e = await setup();
  expect(ok(await e.run('SET f 0.1\nINCRBYFLOAT f 0.2')).rows).toEqual([['INCRBYFLOAT', '0.3']]);
  expect(await e.run('SET big 9223372036854775807\nINCR big')).toMatchObject({ ok: false, error: { message: expect.stringMatching(/overflow/) } });
  expect(await e.run('INCR greeting')).toMatchObject({ ok: false, error: { message: expect.stringMatching(/not an integer/) } });
});
it('implements SET options and the frozen clock', async () => {
  const e = await setup();
  expect(ok(await e.run('SET session:a 2 NX')).rows).toEqual([['SET', null]]);
  expect(ok(await e.run('SET otp 42 NX EX 300\nTTL otp')).rows).toEqual([['TTL', 300]]);
  expect(ok(await e.run('SET greeting hi KEEPTTL GET')).rows).toEqual([['SET', 'hello']]);
  expect(ok(await e.run('TTL session:a')).rows).toEqual([['TTL', 120]]);
  expect(ok(await e.run('EXPIRE session:a 0\nEXISTS session:a')).rows).toEqual([['EXISTS', 0]]);
  expect(ok(await e.run('TTL nope')).rows).toEqual([['TTL', -2]]);
});
it('errors like Redis: wrong type, arity, unknown and blocked commands, with the line', async () => {
  const e = await setup();
  expect(await e.run('GET user:1')).toMatchObject({ ok: false, error: { message: expect.stringMatching(/^WRONGTYPE/) } });
  expect(await e.run('PING\nGET')).toMatchObject({ ok: false, error: { message: expect.stringMatching(/wrong number of arguments for 'get'.*line 2/) } });
  expect(await e.run('FOO bar')).toMatchObject({ ok: false, error: { message: expect.stringMatching(/unknown command 'FOO'/i) } });
  for (const q of ['SHUTDOWN', 'EVAL "return 1" 0', 'SUBSCRIBE news', 'CONFIG SET appendonly yes', 'SELECT 1', 'SNAPSHOT *']) expect((await e.run(q)).ok, q).toBe(false);
});
it('keeps earlier writes when a later line fails, and reset restores the seed', async () => {
  const e = await setup();
  await e.run('SET x 1\nGET user:1');
  expect(ok(await e.run('EXISTS x')).rows).toEqual([['EXISTS', 1]]);
  await e.reset();
  expect(ok(await e.run('EXISTS x')).rows).toEqual([['EXISTS', 0]]);
});
it('snapshot is read-only and supports SNAPSHOT with several globs', async () => {
  const e = await setup();
  expect((await e.snapshot('SET x 1')).ok).toBe(false);
  const s = ok(await e.snapshot('SNAPSHOT session:* views:*'));
  expect(s.columns).toEqual(['key', 'type', 'ttl', 'value']);
  expect(s.rows).toEqual([['session:a', 'string', 120, '1'], ['views:total', 'string', -1, '10']]);
});
it('KEYS sorts; SCAN pages with a cursor notice; MSET/MGET keep order', async () => {
  const e = await setup();
  expect(ok(await e.run('KEYS *')).rows.map((r) => r[0])).toEqual(['greeting', 'session:a', 'user:1', 'views:total']);
  const page = ok(await e.run('SCAN 0 COUNT 2'));
  expect(page).toMatchObject({ columns: ['key'], rows: [['greeting'], ['session:a']], notice: 'Next cursor: 2' });
  expect(ok(await e.run('MSET a 1 b 2\nMGET b a nope')).rows).toEqual([['2'], ['1'], [null]]);
});
```
- [ ] **Implement** generic + string commands from spec §3.2 (Generic, Strings) and `format.ts`:
```ts
export function toTable(reply: Reply, shape: Shape, command: string): { columns: string[]; rows: unknown[][] } {
  const flat = (r: Reply): unknown => (r.t === 'array' ? (r.v ?? []).map(flat) : r.t === 'int' ? r.v : r.v);
  if (shape === 'scalar' || reply.t !== 'array') return { columns: ['command', 'result'], rows: [[command, flat(reply)]] };
  const items = reply.v ?? [];
  switch (shape) {
    case 'values': return { columns: ['value'], rows: items.map((x) => [flat(x)]) };
    case 'unordered': return { columns: ['value'], rows: items.map((x) => [flat(x)]).sort((a, b) => byteCompare(String(a[0]), String(b[0]))) };
    case 'pairs': return { columns: ['field', 'value'], rows: chunk(items.map(flat), 2).sort((a, b) => byteCompare(String(a[0]), String(b[0]))) };
    case 'scored': return { columns: ['member', 'score'], rows: chunk(items.map(flat), 2).map(([m, s]) => [m, Number(s)]) };
    // 'hvals', 'scan', 'stream', 'xread', 'xpending', 'exec': implement per spec §3.3
  }
}
```
Generic commands get `shape: 'scalar'` unless their reply is a list (`KEYS` → `unordered`, `TIME` → `values`, `SCAN` → `scan`). A nil bulk reply is `null`; integers are numbers; bulk strings stay strings (the grader already treats `"10"` and `10` as equal).
- [ ] `src/index.ts`: export `RedisSimEngine`.
- [ ] Tests PASS; typecheck clean.

---

### Task 5: Hashes and lists

**Files:** `src/commands/hashes.ts`, `src/commands/lists.ts`, tests in `src/hashesLists.test.ts`.

- [ ] **Failing tests** must cover: `HSET` with several pairs returns the number of new fields; `HMSET` returns `OK` and gives the same state as `HSET`; `HGETALL` → `field, value` sorted; `HMGET` keeps order with `null` for missing; `HINCRBY` on a non-integer field errors; `HINCRBYFLOAT` formats like `INCRBYFLOAT`; `HDEL` of the last field deletes the key (`EXISTS` → 0); `HKEYS` sorted and `HVALS` in sorted-field order; `LPUSH a b c` then `LRANGE 0 -1` → `c b a`; `LRANGE` clamps out-of-range indices; `LPOP k 2` → two values; popping the last item deletes the key; `LTRIM k 0 9` keeps the first ten; `LMOVE src dst LEFT RIGHT` moves one item and returns it; `RPOPLPUSH` equals `LMOVE … RIGHT LEFT`; `BLPOP empty 5` returns `null` immediately with notice `This lab never blocks: BLPOP returned at once`; `LPOS`, `LINSERT`, `LREM` (count positive/negative/zero), `LSET` out of range → `ERR index out of range`.
- [ ] Implement to spec §3.2. Tests PASS.

---

### Task 6: Sets and sorted sets

**Files:** `src/commands/sets.ts`, `src/commands/zsets.ts`, tests `src/setsZsets.test.ts`.

- [ ] **Failing tests** must cover:
  - Sets: `SADD` counts only new members; `SMEMBERS`/`SINTER`/`SUNION`/`SDIFF` shape `unordered` (sorted rows whatever the insertion order); `SINTERSTORE` returns the size and stores; `SINTERCARD 2 a b LIMIT 1`; `SMISMEMBER` → `values` of 1/0; `SMOVE`; `SPOP`/`SRANDMEMBER` give the same result on two fresh engines (seeded) and after `reset()`.
  - Sorted sets: `ZADD lb GT 50 m` doesn't lower a higher score; `ZADD lb NX`, `CH`, `INCR`; equal scores order by member and `REV` reverses that order too (`ZRANGE lb 0 -1 REV WITHSCORES` with a tie lists the larger member first); `ZRANGE lb (100 +inf BYSCORE LIMIT 0 2 WITHSCORES`; `ZRANGE lb +inf -inf BYSCORE REV` (max first when `REV`); `ZREVRANGE` and `ZRANGEBYSCORE` give the same rows as the modern forms; `ZRANK`/`ZREVRANK`/`ZSCORE` (score as a formatted string reply); `ZINCRBY`; `ZCOUNT` with exclusive bounds; `ZREMRANGEBYSCORE` returns the removed count; `ZPOPMIN k 2` → `scored`; `ZUNIONSTORE out 2 a b WEIGHTS 1 2 AGGREGATE SUM` and `ZINTERSTORE … AGGREGATE MAX`; removing the last member deletes the key.
- [ ] Implement with a `Map<string, number>` plus a sorted view computed per read (`[...entries].sort((a, b) => a[1] - b[1] || byteCompare(a[0], b[0]))`); the lab's data is small. Tests PASS.

---

### Task 7: Bitmaps, HyperLogLog and Streams

**Files:** `src/commands/bits.ts`, `src/commands/streams.ts`, tests `src/bitsStreams.test.ts`.

- [ ] **Failing tests** must cover:
  - `SETBIT k 7 1` returns the old bit; `GETBIT`; `BITCOUNT k` and `BITCOUNT k 0 0` (byte range); `BITOP AND dest a b` returns the result length and `BITCOUNT dest` is the intersection; `TYPE` of a bitmap is `string`.
  - `PFADD hll a b c` → 1, again → 0; `PFCOUNT hll` exact; `PFCOUNT h1 h2` counts the union; `PFMERGE`; `TYPE` is `string`.
  - `XADD s * f v` → `1767225600000-0`, then `1767225600000-1`; `XADD s 5-0 …` after a larger id → `ERR The ID specified in XADD is equal or smaller than the target stream top item`; `MAXLEN 3` trims; `XRANGE s - + COUNT 2` → `id, fields` with `fields` an object; `XREAD COUNT 2 STREAMS s 0` → `stream, id, fields`; `XREAD BLOCK 1000 STREAMS s $` → no rows with the never-blocks notice; `XGROUP CREATE s g 0`; `XREADGROUP GROUP g c1 COUNT 2 STREAMS s >` delivers 2 and they appear in `XPENDING s g` (`count, min_id, max_id, consumers`); reading `>` again delivers the next ones; `XACK s g <id>` → 1 and the pending count drops; `XGROUP CREATE … MKSTREAM` on a missing key.
- [ ] Implement. Tests PASS.

---

### Task 8: Transactions and WATCH

**Files:** `src/transaction.ts` (or inside the engine), tests `src/transactions.test.ts`.

- [ ] **Failing tests:**
```ts
it('queues commands and returns every reply from EXEC', async () => {
  const r = ok(await e.run('MULTI\nDECRBY wallet:a 50\nINCRBY wallet:b 50\nEXEC'));
  expect(r).toMatchObject({ columns: ['index', 'reply'], rows: [[1, 450], [2, 170]] });
  expect(r.documents![1]).toBe('redis> DECRBY wallet:a 50\nQUEUED');
});
it('aborts the whole transaction on a queue-time error', async () => {
  expect(await e.run('MULTI\nINCR wallet:a\nNOSUCHCMD\nEXEC')).toMatchObject({ ok: false, error: { message: expect.stringMatching(/EXECABORT/) } });
  expect(ok(await e.run('GET wallet:a')).rows).toEqual([['GET', '500']]);
});
it('does not roll back when one queued command fails at run time', async () => {
  const r = ok(await e.run('MULTI\nINCRBY wallet:a 10\nINCR user:1\nINCRBY wallet:b 10\nEXEC'));
  expect(r.rows[1]![1]).toMatch(/WRONGTYPE/);
  expect(ok(await e.run('MGET wallet:a wallet:b')).rows).toEqual([['510'], ['130']]);
});
it('returns nil from EXEC when a watched key changed, even by this session', async () => {
  expect(ok(await e.run('WATCH wallet:a\nINCR wallet:a\nMULTI\nINCR wallet:b\nEXEC')).rows).toEqual([['EXEC', null]]);
  expect(ok(await e.run('WATCH wallet:a\nMULTI\nINCR wallet:a\nEXEC')).rows).toEqual([[1, 501]]); // its own queued write doesn't abort
});
it('DISCARD drops the queue; a script ending inside MULTI is discarded with a notice; EXEC without MULTI errors', async () => {
  expect(ok(await e.run('MULTI\nSET z 1\nDISCARD\nEXISTS z')).rows).toEqual([['EXISTS', 0]]);
  expect(ok(await e.run('MULTI\nSET z 1'))).toMatchObject({ notice: expect.stringMatching(/never executed/) });
  expect((await e.run('EXEC')).ok).toBe(false);
  expect((await e.run('MULTI\nMULTI')).ok).toBe(false);
});
```
- [ ] Implement: while in `MULTI`, arity/unknown errors are recorded (transcript shows `(error) …`), set a dirty flag and the script continues; everything else replies `QUEUED`. `EXEC` with the dirty flag → `EXECABORT Transaction discarded because of previous errors.` (stops the script). `WATCH` stores each key's version; `Keyspace.touch` bumps it on every write (including expiry changes and deletes) *outside* the queued execution; `EXEC` checks versions, then runs the queue, then clears watches. Tests PASS.

---

### Task 9: CONFIG, SNAPSHOT values, describe(), seed directives

**Files:** `src/commands/admin.ts`, `src/snapshot.ts`, `src/describe.ts`, tests `src/describe.test.ts`.

- [ ] **Failing tests:** `CONFIG GET maxmemory-policy` → `pairs` `[['maxmemory-policy','noeviction']]`; `CONFIG SET maxmemory-policy allkeys-lru` → `OK` with notice `Stored only: this lab never evicts keys`; an invalid policy → `ERR Invalid argument`; `CONFIG SET appendonly yes` → blocked message. `SNAPSHOT *` values per spec §3.4 for every type (hash object sorted, set sorted, zset `[member, score]` in order, stream with groups and pending ids, HLL `{ hll: n }`, bitmap hex). `describe()` on a seed with `user:1`, `user:2` (hashes), `views:game:1`, `views:game:2` (strings), `leaderboard:global` (zset) and `# @describe user:* Player profiles` → tables `leaderboard:global`, `user:*`, `views:game:*` (sorted by name), `user:*` has `rowCount: 2`, description `Player profiles`, columns = union of hash fields, `sampleQuery: 'HGETALL user:1'`; `leaderboard:global` sample `ZRANGE leaderboard:global 0 9 WITHSCORES`.
- [ ] Implement. Seed directives are read by `setup()` from comment lines matching `^#\s*@describe\s+(\S+)\s+(.+)$`. Tests PASS.

---

### Task 10: Web — worker, engine maps, labUi, results and schema panels

**Files:** Create `apps/web/src/engine/redis.worker.ts`; modify `apps/web/src/engine/createEngine.ts`, `apps/web/package.json` (`"@codeadda/engine-redis-sim": "*"`), `scripts/engines.ts`, `apps/web/src/lab/labUi.ts`, `apps/web/src/components/ResultsPanel.tsx`, `apps/web/src/components/SchemaViewer.tsx`, `LessonFlow.tsx`, `ProblemWorkspace.tsx`; tests `createEngine.test.ts`, `scripts/engines.test.ts`, `labUi.test.ts`, `ResultsPanel.test.tsx`, `SchemaViewer.test.tsx`.

- [ ] **Failing tests:** `createEngine('redis')` spawns `redis.worker.ts`; `engineFor('redis')` is a `RedisSimEngine`; `labUi('redis')` equals the spec §4 values; replace the old "falls back to sql for redis" test with one that casts an unknown language (`labUi('other' as LabLanguage)`) and expects the SQL values; ResultsPanel with `altView="Transcript"` shows a "Results view" radiogroup with "Table"/"Transcript" and renders string documents as preformatted text (`redis> GET a` visible); with no `altView` prop and `documents` present it still shows "Documents" (MongoDB behaviour unchanged); SchemaViewer with `language="redis"` shows `zset` lowercase and "12 keys".
- [ ] **Implement:**
  - `redis.worker.ts`: `serveEngine(new RedisSimEngine());` and add `redis` to `WORKERS`; `engineFor('redis')` returns `new RedisSimEngine()`. `npm install`.
  - `labUi.ts`: add `altView?: string; resultUnit: string` to `LabUi`; SQL `{ resultUnit: 'row' }`, MongoDB `{ altView: 'Documents', resultUnit: 'document' }`, Redis per spec §4 with `altView: 'Transcript', resultUnit: 'row'`.
  - `ResultsPanel`: new optional props `altView` (default `'Documents'` when documents exist) and `resultUnit` (default today's rule); pass `ui.altView`/`ui.resultUnit` from LessonFlow and ProblemWorkspace. Documents render `typeof d === 'string' ? d : JSON.stringify(d, null, 2)`.
  - `SchemaViewer`: replace the `isMongo` switch with `const upper = !language || language === 'sql'`.
  - Monaco: no change (the `redis` label already gets the base worker). Confirm the editor highlights `SET`/`HGETALL` in the browser.
- [ ] `npx vitest run apps/web scripts/engines.test.ts && npm run typecheck` → PASS (all SQL/MongoDB tests unchanged).

---

### Task 11: Dataset and lab.json

**Files:** Create `content/redis/lab.json`, `content/redis/datasets/platform.redis`, `scripts/redisDataset.test.ts`.

- [ ] **Failing test:** load the seed through `RedisSimEngine` and assert **every** fact in spec §5 (counts, the missing `country` on `user:112`, `views:total` = sum, exactly 2 sessions without TTL and the 4 TTL values, `cache:featured` without TTL, the 12-event feed, exactly 3 shared friends, exactly one tie in `leaderboard:global` and no other tie in its top 5, exactly 3 users active all 7 days, the HLL counts, the stream's 10 entries and 4 pending for `worker-a`, `maxmemory-policy` = `noeviction`, `revenue:day:2026-01-01` = `1499.5`); every `@describe` directive matches at least one key; no key or value contains "Chai".
- [ ] `lab.json`:
```json
{
  "id": "redis",
  "title": "Redis Lab",
  "subtitle": "From your first key to Streams, caching and rate limiters",
  "sidebarTitle": "The Redis Path",
  "sidebarSubtitle": "Zero to production, one key at a time",
  "problemsSubtitle": "Practice problems on the ArcadePulse gaming platform",
  "language": "redis",
  "chapters": ["Meet Redis", "Strings & Counters", "Expiration", "Hashes", "Lists", "Sets", "Sorted Sets", "Finding Keys Safely", "Transactions", "Bitmaps & HyperLogLog", "Streams", "Caching Patterns", "Locks & Rate Limiters", "Data Modelling", "Redis in Production"],
  "problemGroups": ["Warm-up", "Everyday Redis", "Production Patterns"],
  "levels": [
    { "title": "Beginner", "from": "Meet Redis" },
    { "title": "Intermediate", "from": "Sets" },
    { "title": "Advanced", "from": "Streams" }
  ]
}
```
- [ ] Write `platform.redis` (≈75 keys, real commands only, `@describe` for every group, fictional international names). Test PASS; `npm run check-content` → `redis: 0 item(s) checked, 0 problem(s)`.

---

### Tasks 12–14: Lessons · Task 15: problems

**Writing rules (every file):** follow spec §7 exactly. Front-matter `id`, `title`, `chapter` (exact `lab.json` title), `order`, `dataset: platform` (or `## Setup` placed last), `check`, `checkQuery` for `state`/`custom`. Sections: explanation (before the first `##`) → `## Watch it happen` (✦ only; YAML from **real** seed rows; 3–5 steps) → `## Context` (runnable ```redis example on a different question) → `## Task` → `## Hint` → `## Solution` (one ```redis block). Problems: `## Tables` (the keys and their types, plus one real example per key), `## Task`, `## Example` (Input/Output/Explanation matching the setup and the real output), `## Hint`, `## Setup` (```redis seed), `## Solution`, `difficulty`.

**State checks:** `checkQuery: SNAPSHOT <globs>` covering every key the task touches and matching ≥ 1 key in the expected state.

**Tasks name every key exactly** (`player:113:name`, not "a well-named key") and give every value, TTL and order the check depends on. The learner chooses the commands, never the key names.

After each task: `npm run check-content` (redis counts: 15 → 30 → 45 → 57), re-read every hint, run every Context example.

#### Task 12: Beginner (lessons 1–15)
| # | Dir / id | Title | Check | checkQuery | Task asks for |
|---|---|---|---|---|---|
| 1 ✦ | `01-meet-redis/01-first-key` | Your first key | state | `SNAPSHOT player:*` | store player 113's display name under `player:113:name` and read it back |
| 2 | `01-meet-redis/02-exists-del` | Checking and deleting keys | state | `SNAPSHOT session:* cache:*` | remove the guest session and the stale featured cache in one go |
| 3 | `01-meet-redis/03-naming-type` | Naming keys well | rows-unordered | — | the type stored at the key holding the global leaderboard |
| 4 | `02-strings-counters/01-mset-mget` | Many keys at once | rows-ordered | — | view counts of games 2, 5 and 7, in that order |
| 5 ✦ | `02-strings-counters/02-incr-decr` | Atomic counters | state | `SNAPSHOT views:*` | record two views of game 3 and correct one double-counted view of game 6 |
| 6 | `02-strings-counters/03-incrby-float` | Steps and decimals | state | `SNAPSHOT views:game:4 revenue:*` | add 25 views to game 4 and 12.75 to the day's revenue |
| 7 ✦ | `03-expiration/01-expire-ttl` | Keys that expire | state | `SNAPSHOT session:*` | give the two sessions without a TTL a 30-minute lifetime |
| 8 | `03-expiration/02-set-options` | Setting with options | state | `SNAPSHOT otp:*` | store a one-time code for user 102 valid 5 minutes, only if none exists |
| 9 | `03-expiration/03-persist-getex` | Changing a key's lifetime | state | `SNAPSHOT cache:*` | make the game-3 cache permanent and delete the featured cache by expiring it |
| 10 ✦ | `04-hashes/01-hset-hget` | Objects as hashes | state | `SNAPSHOT user:113` | create player 113 with the given fields |
| 11 | `04-hashes/02-hgetall-hmget` | Reading many fields | rows-ordered | — | name, tier and country of user 104, in that order |
| 12 | `04-hashes/03-hincrby-hdel` | Changing fields | state | `SNAPSHOT user:105` | add 150 XP to user 105 and remove their `joined_on` field |
| 13 ✦ | `05-lists/01-push-range` | Queues and stacks | state | `SNAPSHOT queue:*` | add two email jobs to the back of the queue |
| 14 | `05-lists/02-pop-move` | Taking items off | state | `SNAPSHOT queue:*` | move the oldest email job into the processing list |
| 15 | `05-lists/03-ltrim-capped` | Capped lists | state | `SNAPSHOT feed:*` | add a new event to the front of user 101's feed and keep only the newest 10 |

#### Task 13: Intermediate (lessons 16–30)
| # | Dir / id | Title | Check | checkQuery | Task asks for |
|---|---|---|---|---|---|
| 16 ✦ | `06-sets/01-sadd-smembers` | Unique members | state | `SNAPSHOT tags:user:103` | add three tags to user 103 (one already present) |
| 17 | `06-sets/02-set-maths` | Set maths | rows-unordered | — | tags users 101 and 102 share |
| 18 | `06-sets/03-store-count` | Storing and counting results | state | `SNAPSHOT friends:*` | save the mutual friends of 101 and 102 under a new key |
| 19 ✦ | `07-sorted-sets/01-zadd` | Scores and members | state | `SNAPSHOT leaderboard:global` | submit new scores for three players where only higher scores should count |
| 20 | `07-sorted-sets/02-range-by-rank` | Reading by rank | rows-ordered | — | top 5 players with scores, highest first (the tie is inside) |
| 21 | `07-sorted-sets/03-range-by-score` | Reading by score | rows-ordered | — | first 3 players with XP from 2000 up to but not including 3000, lowest first |
| 22 | `07-sorted-sets/04-rank-incr` | Ranks and increments | state | `SNAPSHOT leaderboard:global` | award 120 XP to player 108 |
| 23 ✦ | `08-finding-keys/01-scan` | Why not KEYS | rows-unordered | — | every `game:*` key, found with a scan |
| 24 | `08-finding-keys/02-scan-filter-rename` | Filtering a scan | state | `SNAPSHOT cache:*` | rename the featured cache to the team's new naming scheme |
| 25 ✦ | `09-transactions/01-multi-exec` | All or nothing | state | `SNAPSHOT wallet:*` | move 50 credits from wallet 101 to 102 atomically |
| 26 | `09-transactions/02-errors-inside` | When commands fail inside | rows-ordered | — | the EXEC reply of the described three-step transaction where the middle step hits the wrong type |
| 27 ✦ | `09-transactions/03-watch` | Optimistic locking | rows-unordered | — | the result of a transaction whose watched wallet changed before EXEC |
| 28 | `10-bitmaps-hll/01-setbit-bitcount` | One bit per user | rows-unordered | — | how many users were active on 2026-01-03 |
| 29 | `10-bitmaps-hll/02-bitop` | Combining days | state | `SNAPSHOT active:week:*` | store the users active on every day of the week under a new key |
| 30 | `10-bitmaps-hll/03-hyperloglog` | Counting unique visitors | rows-unordered | — | unique visitors across both days |

#### Task 14: Advanced (lessons 31–45)
| # | Dir / id | Title | Check | checkQuery | Task asks for |
|---|---|---|---|---|---|
| 31 ✦ | `11-streams/01-xadd-xrange` | An append-only log | state | `SNAPSHOT events:*` | append a match-finished event with the given fields |
| 32 | `11-streams/02-xread` | Reading new entries | rows-ordered | — | the next 3 entries after a given ID |
| 33 ✦ | `11-streams/03-consumer-groups` | Consumer groups | state | `SNAPSHOT events:*` | create a `notifiers` group from the start and have `worker-b` take 2 entries |
| 34 | `11-streams/04-xack-pending` | Acknowledging work | state | `SNAPSHOT events:*` | acknowledge the two oldest entries pending for `worker-a` |
| 35 | `12-caching/01-cache-aside` | Cache-aside | state | `SNAPSHOT cache:*` | on a miss for game 5, cache its title for 5 minutes |
| 36 | `12-caching/02-invalidation` | Keeping caches fresh | state | `SNAPSHOT game:3 cache:*` | change game 3's price and invalidate its cache |
| 37 | `12-caching/03-stampede-jitter` | Stampedes and jitter | state | `SNAPSHOT lock:* cache:*` | take the rebuild lock for game 6 for 10 s and cache it with the jittered TTL given |
| 38 ✦ | `13-locks-limits/01-distributed-lock` | A distributed lock | state | `SNAPSHOT lock:*` | acquire the checkout lock for user 101 with the given token for 30 s (a second attempt must not overwrite it) |
| 39 | `13-locks-limits/02-fixed-window` | Fixed-window limiter | state | `SNAPSHOT ratelimit:fixed:*` | count one request in the current minute's window and set its expiry only if it has none |
| 40 | `13-locks-limits/03-sliding-window` | Sliding-window limiter | state | `SNAPSHOT ratelimit:api:*` | drop requests older than 60 s, record the new one |
| 41 | `14-data-modelling/01-session-store` | A session store | state | `SNAPSHOT session:*` | create a hash session with the given fields and a 30-minute TTL |
| 42 | `14-data-modelling/02-secondary-indexes` | Secondary indexes | rows-unordered | — | ids of pro-tier players in India |
| 43 | `14-data-modelling/03-combine-leaderboards` | Combining leaderboards | state | `SNAPSHOT leaderboard:week:*` | store the week's final board where bonus points count double |
| 44 | `15-production/01-memory-eviction` | Memory and eviction | state | `SNAPSHOT cache:*` | audit `cache:*` and give the key without a TTL a 10-minute TTL |
| 45 | `15-production/02-persistence-cluster` | Persistence, replication and Cluster | state | `SNAPSHOT *user:101*` | move user 101's profile and tags under the hash tag `{user:101}` |

Animated positions: `[1, 5, 7, 10, 13, 16, 19, 23, 25, 27, 31, 33, 38]`.

#### Task 15: Problems (12)
| Group dir | # / id | Title | Difficulty | Check | Skill |
|---|---|---|---|---|---|
| `01-warm-up` | 01 `session-with-expiry` | Session With Expiry | Easy | state | `SET … EX` (a missing TTL fails) |
| `01-warm-up` | 02 `page-view-counter` | Page-View Counter | Easy | state | `INCR`/`INCRBY` on several keys |
| `01-warm-up` | 03 `profile-update` | Profile Update | Easy | state | `HSET` several fields + `HINCRBY` |
| `01-warm-up` | 04 `shared-interests` | Shared Interests | Easy | rows-unordered | `SINTER` |
| `02-everyday-redis` | 01 `capped-activity-feed` | Capped Activity Feed | Medium | state | `LPUSH` + `LTRIM` |
| `02-everyday-redis` | 02 `weekly-podium` | Weekly Podium | Medium | rows-ordered | `ZRANGE … REV WITHSCORES` with a tie |
| `02-everyday-redis` | 03 `mutual-friends-online` | Mutual Friends Online | Medium | rows-unordered | three-way `SINTER` |
| `02-everyday-redis` | 04 `checkout-transaction` | Checkout Transaction | Medium | state | `MULTI`: stock, wallet, cart |
| `03-production-patterns` | 01 `sliding-window-limiter` | Sliding-Window Limiter | Hard | state | `ZREMRANGEBYSCORE` + `ZADD` + `ZCARD` |
| `03-production-patterns` | 02 `stream-worker-recovery` | Stream Worker Recovery | Hard | state | `XREADGROUP` + `XACK` so exactly the unfinished work stays pending |
| `03-production-patterns` | 03 `weekly-active-cohort` | Weekly Active Cohort | Hard | state | `BITOP AND` over 7 days into a key |
| `03-production-patterns` | 04 `merged-leaderboard` | Merged Leaderboard | Hard | rows-ordered | `ZUNIONSTORE … WEIGHTS` then the top 3 |

---

### Task 16: Quality tests, home page, e2e, README, verification

**Files:** Create `scripts/redisLabShape.test.ts`, `scripts/redisChecks.test.ts`; modify `apps/web/src/home/homeContent.ts`, `apps/web/src/home/homeContent.test.ts`, `apps/web/src/home/HomePage.test.tsx`, `apps/web/src/content/registry.test.ts`, `apps/web/src/components/Navbar.test.tsx`, `LabHeader.test.tsx`, `apps/web/plugins/labContent.test.ts`, `packages/content-loader/src/summary.test.ts` (if it counts labs), `e2e/lab.spec.ts`, `README.md`.

- [ ] **`redisLabShape.test.ts`** (pattern of `mongoLabShape.test.ts`): chapter counts `[3,3,3,3,3,3,4,2,3,3,4,3,3,3,2]`; 45 lessons; first lesson "Your first key"; animated positions as above; every lesson has a body and a context; levels; 12 problems 4/4/4 in the three groups, each with setup, tables, example and no dataset.
- [ ] **`redisChecks.test.ts`** (pattern of `mongoChecks.test.ts`, engine `RedisSimEngine`):
  - every `state` lesson and problem fails `PING`, `EXISTS nope` and `FLUSHDB`; pin the exact number of state items;
  - every `state` checkQuery starts with `SNAPSHOT ` and matches ≥ 1 key after the solution;
  - equivalents pass: lesson 8 with `SET … NX EX` and with `SET` + `EXPIRE` in a transaction… (whichever the Task allows); lesson 10 with `HMSET`; lesson 20 with `ZREVRANGE … WITHSCORES`; lesson 17 with the sets in either order;
  - look-alikes fail: lesson 3 answered with `EXISTS leaderboard:global`; lesson 28 answered with `GETBIT`;
  - problem 1 without a TTL fails.
- [ ] **Home:** `LIVE_DESCRIPTIONS.redis` (spec §4); `labsHeadline(4, 0)` is already `"Four labs are open."` — assert it; the labs band has no "Coming soon" card; navbar shows four links and no disabled item; `upcomingLabs()` → `[]`.
- [ ] **e2e** — update the region name to "Four labs are open." and every assertion that treated Redis as coming soon; append `test.describe('redis lab', …)`:
  1. `/redis` → "Your first key" → Solution → Load into editor → Run → "Correct!"; editor title "Redis CLI".
  2. Skip banner "Already know the Redis basics?" → first Sets lesson without a reload.
  3. Transcript toggle: run a two-command script, switch to Transcript, see `redis> ` lines, switch back.
  4. Schema: the panel lists `user:*` with "12 keys"; View sample data shows a hash.
  5. The consumer-groups lesson solves end to end.
  6. Home: the Redis card links to `/redis`, no "Coming soon" anywhere, `/` requests no `lab-content/`.
- [ ] **README:** four labs (counts), the Redis package, the supported command families, the simulator's differences (frozen clock, exact HyperLogLog, non-blocking `B*`, simulated `CONFIG`, `#` comments), the `.redis` dataset format and `@describe`.
- [ ] **Verify:** `npm run typecheck && npm test && npm run check-content && npm run e2e` → clean; content `sql 70`, `postgres 58`, `mongodb 52`, `redis 57`; e2e all pass (40 existing, some updated on purpose, + 6 new). `npm run build -w @codeadda/web`: entry `index-*.js` ≤ 295 kB, separate `redis.worker-*.js` and `redis-*.js` chunks, `grep -rl jsdelivr apps/web/dist` finds nothing.
- [ ] Ledger summary: numbers, bundle sizes, rulings, deferred items.

## Self-review notes
- Spec coverage: §2 decisions → Tasks 2–9; §3 engine → Tasks 1–9; §4 web → Tasks 10, 16; §5 dataset → Task 11; §6 curriculum → Tasks 12–15; §7 rules → Tasks 12–15 header; §8 verification → Tasks 15–16.
- Verified in the codebase before writing: `LabLanguage` already includes `'redis'`; the loader's dataset regex accepts `.redis`; `grade()` runs `engine.snapshot(checkQuery)` right after the learner's script (so `SNAPSHOT` needs no core change); `labsHeadline(4, 0)` returns "Four labs are open."; Monaco ships a `redis` language; the vite warm-up already covers `*.worker.ts`.
