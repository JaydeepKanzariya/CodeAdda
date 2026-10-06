# Stage 4: Redis Lab — Design Spec (v2)

- **Date:** 2026-10-06
- **Status:** Approved design (v2 replaces the first draft after review)
- **Branch:** `feature/stage-4-redis-lab` (the owner commits; implementers never commit)

## 1. Goal

Add the fourth lab, **Redis**, at `/redis`, taking a learner from **zero** ("what is a key?") to **industry-standard** Redis (Redis 7): every core data type, safe key discovery, transactions and optimistic locking, bitmaps and HyperLogLog, Streams with consumer groups, and the production patterns teams actually ship (cache-aside, invalidation, locks, rate limiters, session stores, secondary indexes, leaderboards), plus the operational knowledge (memory and eviction, persistence, replication, Cluster) that a working engineer needs. It runs **in the browser, offline**, on a new engine `@codeadda/engine-redis-sim`.

### Success criteria
1. `/redis` has Lessons and LeetLab tabs with the same design as the other labs.
2. **15 chapters, 45 lessons (13 animated ✦), 12 problems (4 Easy / 4 Medium / 4 Hard)** across Beginner / Intermediate / Advanced with the skip banner.
3. Learners type real `redis-cli` commands. The lab teaches **modern Redis 7 forms** first (`HSET` with many fields, `LMOVE`, `ZRANGE … BYSCORE | REV | LIMIT`, `SET … NX EX`); legacy forms (`HMSET`, `RPOPLPUSH`, `ZREVRANGE`, `ZRANGEBYSCORE`, `SETEX`, `SETNX`) still work and get one "you'll see this in older code" note.
4. Grading can't be fooled: write lessons are checked on the **whole affected key space including TTLs**; single-value answers carry the command name; unordered replies are canonical.
5. Monaco uses its built-in `redis` mode; the editor is titled "Redis CLI".
6. The schema panel ("keys") groups keys by pattern (`user:*` — 12 hashes) with types, TTLs and a working "View sample data".
7. `npm run check-content`: **redis 57** (45 + 12) + mongodb 52 + postgres 58 + sql 70, 0 problems.
8. Home page: all four labs live, headline **"Four labs are open."** (computed by `labsHeadline(4, 0)`), no "Coming soon" card. Entry bundle ≤ 295 kB; the engine and content load only on `/redis`.
9. All existing tests stay green; zero CDN or network use; zero new npm dependencies.

## 2. Decisions

| Topic | Decision | Why |
|---|---|---|
| Engine | `@codeadda/engine-redis-sim`, plain TypeScript, **no dependencies** | Small, deterministic, instant reset; no WASM Redis exists that runs offline in a worker |
| Real Redis (Docker) | Out of scope | Zero-setup is the product |
| Routing | `redis.worker.ts` in the per-language worker map; `engineFor('redis')` in `scripts/engines.ts` | Only `/redis` downloads it |
| Parsing | `redis-cli` tokenizer: whitespace-separated args, `"…"` with escapes (`\" \\ \n \r \t \xHH`), `'…'` (only `\'`), a closing quote must be followed by whitespace or end of line; commands case-insensitive, keys case-sensitive; **a line starting with `#` is a comment** (lab convenience, explained once); one command per line | Matches the real CLI; `#` inside values (`tag#1`) stays data |
| Clock | **Virtual clock frozen** at `2026-01-01T00:00:00Z` (`NOW_MS = 1767225600000`). `TTL` is exact; nothing expires on its own; `EXPIRE k 0`, negative TTLs and past `EXPIREAT` delete the key (as in Redis). **No invented time-skip command.** | Deterministic grading; never teaches a fake command |
| Randomness | `SPOP` / `SRANDMEMBER` use a seeded PRNG (mulberry32, seed reset on `setup`/`reset`); never used in graded tasks | Deterministic |
| Numbers | Integers via `BigInt` with Redis range checks (`ERR increment or decrement would overflow`); floats (`INCRBYFLOAT`, `HINCRBYFLOAT`, scores) formatted with 15 significant digits, trailing zeros trimmed (`0.1 + 0.2` → `"0.3"`, `10.5 + 0.5` → `"11"`), `inf`/`-inf` spelled like Redis | Matches Redis output for every value the lessons use |
| HyperLogLog | Simulated **exactly** (a set inside a `string`-typed key); `TYPE` says `string` like Redis | Deterministic; the lesson explains that real Redis is approximate (~0.81% error) |
| Bitmaps | Byte array inside a string key; `SETBIT`, `GETBIT`, `BITCOUNT [start end]` (byte ranges), `BITOP AND/OR/XOR/NOT` | Real semantics |
| Streams | Auto IDs `<NOW_MS>-<seq>` (seq increments); explicit IDs must be greater than the last; `MAXLEN` trims exactly (`~` accepted, treated as exact, noted) ; `BLOCK` on `XREAD`/`XREADGROUP` and `BLPOP`/`BRPOP`/`BLMOVE` returns immediately (nil when nothing is available) with a notice | One session can't block; still real replies |
| Transactions | `MULTI`/`EXEC`/`DISCARD`/`WATCH`/`UNWATCH` with real semantics: queue-time errors (unknown command, wrong arity) make `EXEC` fail with `EXECABORT`; runtime errors (e.g. `WRONGTYPE`) are returned inside the `EXEC` reply and **nothing is rolled back**; a write to a watched key before `EXEC` (even by this session) makes `EXEC` return nil | These are the interview-grade facts |
| Script errors | Outside `MULTI`, the first error stops the script and reports `line N, column M` with the real Redis error text plus a friendly hint. Inside `MULTI`, queue-time errors are recorded and the script continues to `EXEC`. A script that ends inside `MULTI` discards it with a notice | Clear feedback, real behaviour |
| Not supported (clear message, never a crash) | `SHUTDOWN`, `DEBUG`, `MONITOR`, `SAVE`, `BGSAVE`, `BGREWRITEAOF`, `REPLICAOF`/`SLAVEOF`, `CLIENT`, `CLUSTER`, `MIGRATE`, `SELECT` (one database), `EVAL`/`EVALSHA`/`SCRIPT`/`FUNCTION`/`FCALL`, `SUBSCRIBE`/`PSUBSCRIBE`/`PUBLISH`, `CONFIG` except the whitelist below | Each message says *why* and where the topic is taught |
| `CONFIG` | Only `CONFIG GET`/`CONFIG SET` for `maxmemory` (default `"0"`) and `maxmemory-policy` (default `"noeviction"`, validated against the 8 real policy names). Stored only; **no eviction happens** (noticed) | Lets the eviction lesson use the real commands |
| Grader-only command | `SNAPSHOT <glob> [glob …]` — accepted **only by `snapshot()`**, unknown in `run()`. Returns every matching key: `key, type, ttl, value` (canonical, §3.4) | One check catches collateral damage, wrong types and missing TTLs |
| `snapshot()` | Read-only: executes read commands and `SNAPSHOT`; a write command returns an error | A check can never change state |
| Dataset format | `content/redis/datasets/platform.redis`: a seed script of real commands (one per line, `#` comments), plus directives `# @describe <pattern> <text>` for the schema panel | Readable; the loader already accepts `.redis` |
| Problem setup | `## Setup` with a ```redis seed block; solutions use ```redis fences | Same format as other labs |

## 3. Engine (`@codeadda/engine-redis-sim`)

### 3.1 Shape
`RedisSimEngine implements Engine` (`kind: 'redis'`, `mode: 'browser'`):
- `setup(dataset)`: parse and execute the seed script (errors include the seed line), collect `@describe` directives, store a pristine deep copy; `reset()` restores it (and the PRNG seed, the transaction and watch state).
- `run(script)`: execute all commands; return the **last command's reply** as the table (§3.3), `documents` = a redis-cli transcript, one string per command (`"redis> SET k v\nOK"`), and `notice` where relevant (next SCAN cursor, discarded transaction, non-blocking `B*`, simulated `CONFIG`).
- `snapshot(query)`: read-only run (see §2).
- `describe()`: §3.5.
- Store: `Map<string, Entry>`; `Entry = { type: 'string'|'hash'|'list'|'set'|'zset'|'stream'; value; expiresAt?: number }`. Each command is a table entry `{ name, arity, flags: ('write'|'read'|'admin')[], run }` so arity errors (`ERR wrong number of arguments for 'get' command`), unknown commands (`ERR unknown command 'FOO', with args beginning with: …`) and `WRONGTYPE Operation against a key holding the wrong kind of value` come from one place.

### 3.2 Commands (Redis 7 semantics)
- **Generic:** `PING`, `ECHO`, `TIME`, `DEL`, `UNLINK`, `EXISTS`, `TYPE`, `RENAME`, `RENAMENX`, `KEYS` (glob `* ? [abc] [^a] \x`), `SCAN cursor [MATCH p] [COUNT n] [TYPE t]` (cursor = offset into the sorted key list, default COUNT 10, final cursor `0`), `DBSIZE`, `FLUSHDB`, `FLUSHALL`, `EXPIRE`/`PEXPIRE` (with `NX|XX|GT|LT`), `EXPIREAT`, `TTL`, `PTTL`, `PERSIST`.
- **Strings:** `SET key value [NX|XX] [GET] [EX s|PX ms|EXAT ts|KEEPTTL]`, `GET`, `GETDEL`, `GETEX [EX|PX|PERSIST]`, `SETEX`, `SETNX`, `MSET`, `MSETNX`, `MGET`, `APPEND`, `STRLEN`, `GETRANGE`, `INCR`, `DECR`, `INCRBY`, `DECRBY`, `INCRBYFLOAT`.
- **Hashes:** `HSET` (many pairs), `HSETNX`, `HGET`, `HMGET`, `HGETALL`, `HDEL`, `HEXISTS`, `HKEYS`, `HVALS`, `HLEN`, `HINCRBY`, `HINCRBYFLOAT`, `HMSET` (legacy).
- **Lists:** `LPUSH`, `RPUSH`, `LPOP [count]`, `RPOP [count]`, `LRANGE`, `LLEN`, `LINDEX`, `LSET`, `LREM`, `LTRIM`, `LINSERT`, `LPOS`, `LMOVE`, `BLPOP`, `BRPOP`, `BLMOVE` (non-blocking), `RPOPLPUSH` (legacy).
- **Sets:** `SADD`, `SREM`, `SMEMBERS`, `SISMEMBER`, `SMISMEMBER`, `SCARD`, `SINTER`, `SUNION`, `SDIFF`, `SINTERSTORE`, `SUNIONSTORE`, `SDIFFSTORE`, `SINTERCARD numkeys … [LIMIT n]`, `SMOVE`, `SPOP`, `SRANDMEMBER`.
- **Sorted sets:** `ZADD [NX|XX] [GT|LT] [CH] [INCR]`, `ZREM`, `ZSCORE`, `ZMSCORE`, `ZINCRBY`, `ZCARD`, `ZCOUNT`, `ZRANK`, `ZREVRANK`, `ZRANGE key min max [BYSCORE] [REV] [LIMIT off n] [WITHSCORES]`, `ZREMRANGEBYSCORE`, `ZREMRANGEBYRANK`, `ZPOPMIN`, `ZPOPMAX`, `ZUNIONSTORE`/`ZINTERSTORE … [WEIGHTS …] [AGGREGATE SUM|MIN|MAX]`, legacy `ZREVRANGE`, `ZRANGEBYSCORE`, `ZREVRANGEBYSCORE`. Score bounds accept `-inf`, `+inf` and exclusive `(`; equal scores order by member (byte order).
- **Bitmaps / HLL:** `SETBIT`, `GETBIT`, `BITCOUNT`, `BITOP`, `PFADD`, `PFCOUNT` (one or many keys), `PFMERGE`.
- **Streams:** `XADD key [MAXLEN [~] n] *|id field value …`, `XLEN`, `XRANGE key start end [COUNT n]` (`-`/`+`), `XREVRANGE`, `XDEL`, `XTRIM key MAXLEN n`, `XREAD [COUNT n] [BLOCK ms] STREAMS key id`, `XGROUP CREATE key group id|$ [MKSTREAM]`, `XGROUP DESTROY`, `XREADGROUP GROUP g c [COUNT n] [BLOCK ms] STREAMS key >|id`, `XACK`, `XPENDING key group` (summary form).
- **Transactions:** `MULTI`, `EXEC`, `DISCARD`, `WATCH`, `UNWATCH`.
- **Config:** whitelisted `CONFIG GET` / `CONFIG SET` (§2).

### 3.3 Reply → table (canonical shapes)
The table always shows the **last** command's reply:

| Reply | Columns | Rows |
|---|---|---|
| Status, integer, bulk string or nil | `command, result` | `[['SISMEMBER', 1]]` — the uppercase command name stops a different command that happens to return the same value from passing |
| Flat list in Redis order (`LRANGE`, `MGET`, `HMGET`, `LPOP n`, `ZRANGE` without scores, `SMISMEMBER`, `TIME`) | `value` | one row per element, nil → `null` |
| Unordered list (`SMEMBERS`, `SINTER`, `SUNION`, `SDIFF`, `KEYS`, `HKEYS`, `SPOP n`, `SRANDMEMBER n`) | `value` | **sorted** (byte order) |
| `HVALS` | `value` | ordered by sorted field name |
| Field/value pairs (`HGETALL`, `CONFIG GET`) | `field, value` | sorted by field |
| Scored (`… WITHSCORES`, `ZPOPMIN/MAX`) | `member, score` | Redis order; score as a number |
| `SCAN` | `key` | the page's keys; `notice: "Next cursor: N"` |
| Stream entries (`XRANGE`, `XREVRANGE`) | `id, fields` | `fields` is an object `{ field: value }` |
| `XREAD`, `XREADGROUP` | `stream, id, fields` | nil → no rows + notice |
| `XPENDING` summary | `count, min_id, max_id, consumers` | `consumers` = object `{ name: count }` |
| `EXEC` | `index, reply` | one row per queued reply (1-based); nested replies are JSON values; aborted (`WATCH`) → `[['EXEC', null]]` in the scalar shape |
| Empty list | the shape's columns | no rows |

### 3.4 `SNAPSHOT <glob> [glob …]` (grader only)
Columns `key, type, ttl, value`, one row per key matching any glob, sorted by key. `ttl` = seconds left or `-1`. `value`: string → the string; hash → object (sorted keys); list → array; set → sorted array; zset → array of `[member, score]` in score order; stream → array of `{ id, fields }` plus `groups: { name: { last_delivered, pending: [ids] } }`; HLL → `{ hll: <exact count> }`; bitmap → hex string.

### 3.5 `describe()` — grouped keys
Group keys by pattern: a key's candidate pattern is its segments with the last `:` segment replaced by `*` (`user:101` → `user:*`, `views:game:3` → `views:game:*`); a pattern with ≥ 2 keys **of the same type** becomes a group, every other key is shown alone. Each group → `TableInfo { name: pattern, description: @describe text, rowCount: number of keys, columns, sampleQuery }`. Columns: for hashes, the union of field names (type `field`); otherwise `key`, `type`, `size` (length/cardinality), `ttl`. `sampleQuery` targets the group's first key by type: `GET`, `HGETALL`, `LRANGE k 0 9`, `SMEMBERS`, `ZRANGE k 0 9 WITHSCORES`, `XRANGE k - + COUNT 5`. `relationships: []`. Unit word: **keys**.

## 4. Web
- **Engine map:** `redis: () => new Worker(new URL('./redis.worker.ts', import.meta.url), { type: 'module' })`; `redis.worker.ts` = `serveEngine(new RedisSimEngine())`.
- **`labUi('redis')`:** `monaco: 'redis'`, `editorTitle: 'Redis CLI'`, `starter: '# Write your Redis commands here\n'`, `skipPrompt: 'Already know the Redis basics?'`, `problemsSubtitle: 'Original Redis challenges, easy to hard'`, `unit: 'keys'`. New fields for every language: `altView` (`undefined` for SQL, `'Documents'` for MongoDB, `'Transcript'` for Redis) and `resultUnit` (`'row'`, `'document'`, `'row'`).
- **ResultsPanel:** takes optional `altView` and `resultUnit` props (defaults reproduce today's behaviour exactly, so the existing MongoDB/SQL tests don't change); renders string documents as preformatted text and objects as pretty JSON.
- **SchemaViewer:** uppercases types only for SQL labs; Redis shows `hash`, `zset`, `stream`…
- **Monaco:** the `redis` label uses the base editor worker (already the default branch).
- **Home:** `LIVE_DESCRIPTIONS.redis` = "From your first key to Streams, caching and rate limiters, all on a live gaming-platform database."; `upcomingLabs()` → `[]`; the labs band renders without any "Coming soon" card; navbar shows four links.

## 5. Dataset: "ArcadePulse" (`platform.redis`, ~75 keys)
A fictional gaming and creator platform. Facts the lessons rely on (all asserted by `scripts/redisDataset.test.ts`):
- `user:101`–`user:112`: hashes `name, email, tier (free|plus|pro), country, xp, joined_on`; **`user:112` has no `country`**; names are fictional and international.
- `game:1`–`game:8`: hashes `title, genre, price, rating` (`rating` a float such as `4.6`).
- `views:game:1`–`views:game:8` and `views:total`: integer strings; `views:total` equals their sum. `revenue:day:2026-01-01` = `"1499.5"` (float counter).
- `session:<token>`: 6 strings holding a user id; 4 with TTLs (120, 1800, 3600, 86400) and **2 without a TTL** (the bug the session lesson fixes); `session:guest_99` exists for the delete lesson.
- `cache:game:3` (string, TTL 300) and `cache:featured` (string, **no TTL**) for the caching and eviction lessons.
- `feed:101`: list of 12 events (`levelup:7`, `badge:speedrun` …) for `LTRIM`; `queue:emails`: list of 5 jobs; `queue:emails:processing` empty (for `LMOVE`).
- `tags:user:101` … `tags:user:106`: sets; `friends:101` and `friends:102` share **exactly 3** members; `online:users` set of 6 ids.
- `index:tier:pro`, `index:tier:plus`, `index:country:IN` … sets matching the user hashes.
- `leaderboard:global`: zset of 12 users by XP with **exactly one tie** (two users, same score — teaches member-order tie-breaks); no other ties in the top 5. `leaderboard:week:2026-01` (8 users) and `bonus:week:2026-01` (5 users) for `ZUNIONSTORE … WEIGHTS`.
- `wallet:101` = `500`, `wallet:102` = `120` (credits); `stock:item:7` hash for the checkout transaction.
- `active:2026-01-01` … `active:2026-01-07`: bitmaps keyed by user id offset; **exactly 3 users active all 7 days**.
- `visitors:2026-01-01`, `visitors:2026-01-02`: HLLs with known exact counts and overlap.
- `events:matches`: stream of 10 entries with explicit increasing IDs; group `scorers` created at `0` with 4 entries delivered to consumer `worker-a` and still pending.
- `ratelimit:api:101`: zset of request timestamps (ms) spanning the sliding-window lesson.
- `maxmemory-policy` starts at `noeviction`.

## 6. Curriculum — 15 chapters, 45 lessons (13 ✦), 12 problems

**Beginner** (Chapters 1–5, lessons 1–15)
1. **Meet Redis** — 1 Your first key ✦ (`SET`/`GET`, what in-memory key-value means) · 2 Checking and deleting keys (`EXISTS`, `DEL`, `UNLINK`) · 3 Naming keys well (`object:id:field` conventions, `TYPE`)
2. **Strings & Counters** — 4 Many keys at once (`MSET`, `MGET`) · 5 Atomic counters ✦ (`INCR`, `DECR`) · 6 Steps and decimals (`INCRBY`, `INCRBYFLOAT`)
3. **Expiration** — 7 Keys that expire ✦ (`EXPIRE`, `TTL`) · 8 Setting with options (`SET … EX | NX | XX | GET`) · 9 Changing a key's lifetime (`PERSIST`, `GETEX`, `EXPIRE k 0`)
4. **Hashes** — 10 Objects as hashes ✦ (`HSET`, `HGET`) · 11 Reading many fields (`HGETALL`, `HMGET`; `HMSET` legacy note) · 12 Changing fields (`HINCRBY`, `HDEL`, `HEXISTS`)
5. **Lists** — 13 Queues and stacks ✦ (`LPUSH`, `RPUSH`, `LRANGE`) · 14 Taking items off (`LPOP`/`RPOP` with count, `LMOVE`; `RPOPLPUSH` legacy) · 15 Capped lists (`LTRIM` for "latest N")

**Intermediate** (Chapters 6–10, lessons 16–30)
6. **Sets** — 16 Unique members ✦ (`SADD`, `SISMEMBER`, `SMEMBERS`, `SCARD`) · 17 Set maths (`SINTER`, `SUNION`, `SDIFF`) · 18 Storing and counting results (`SINTERSTORE`, `SINTERCARD`, `SMISMEMBER`)
7. **Sorted Sets** — 19 Scores and members ✦ (`ZADD`, `GT`/`NX`) · 20 Reading by rank (`ZRANGE … REV WITHSCORES`, tie order) · 21 Reading by score (`ZRANGE … BYSCORE LIMIT`, `(` exclusive, `ZCOUNT`) · 22 Ranks and increments (`ZRANK`, `ZSCORE`, `ZINCRBY`)
8. **Finding Keys Safely** — 23 Why not KEYS ✦ (`SCAN` cursors) · 24 Filtering a scan (`SCAN MATCH … TYPE`, `RENAME`)
9. **Transactions** — 25 All or nothing ✦ (`MULTI`, `EXEC`, `DISCARD`) · 26 When commands fail inside (`EXECABORT` vs runtime errors, no rollback) · 27 Optimistic locking ✦ (`WATCH`)
10. **Bitmaps & HyperLogLog** — 28 One bit per user (`SETBIT`, `GETBIT`, `BITCOUNT`) · 29 Combining days (`BITOP AND`) · 30 Counting unique visitors (`PFADD`, `PFCOUNT`, `PFMERGE`)

**Advanced** (Chapters 11–15, lessons 31–45)
11. **Streams** — 31 An append-only log ✦ (`XADD`, `XRANGE`, `XLEN`) · 32 Reading new entries (`XREAD` after an ID; what `BLOCK` does) · 33 Consumer groups ✦ (`XGROUP CREATE`, `XREADGROUP`) · 34 Acknowledging work (`XACK`, `XPENDING`; recovering stuck work with `XAUTOCLAIM`, explained)
12. **Caching Patterns** — 35 Cache-aside (miss → load → `SET … EX`) · 36 Keeping caches fresh (invalidate on write with `DEL`/`UNLINK`, TTL as a safety net) · 37 Stampedes and jitter (`SET … NX EX` rebuild lock, jittered TTLs)
13. **Locks & Rate Limiters** — 38 A distributed lock ✦ (`SET lock NX EX`, release; why safe release needs a check-and-delete script) · 39 Fixed-window limiter (`INCR` + `EXPIRE … NX` in a transaction) · 40 Sliding-window limiter (`ZADD`, `ZREMRANGEBYSCORE`, `ZCARD`)
14. **Data Modelling** — 41 A session store (hash + TTL, refresh on use) · 42 Secondary indexes (sets per attribute, `SINTER` to query) · 43 Combining leaderboards (`ZUNIONSTORE … WEIGHTS`)
15. **Redis in Production** — 44 Memory and eviction (`maxmemory`, the eight policies, `volatile-*` needs TTLs; task: an audit with `SCAN` + `TTL`, then give the cache key without a TTL one) · 45 Persistence, replication and Cluster (RDB vs AOF, replicas and Sentinel, Cluster slots and **hash tags**; when to choose Pub/Sub, Streams or Lua; task: rename a user's keys into one hash tag `{user:101}:…`)

**Problems** (groups: Warm-up, Everyday Redis, Production Patterns)
- Easy: Session with expiry · Page-view counter · Profile update · Shared interests
- Medium: Capped activity feed · Weekly podium (with the tie) · Mutual friends online · Checkout transaction
- Hard: Sliding-window limiter · Stream worker recovery · Weekly active cohort · Merged leaderboard

## 7. Content quality rules (every file)
1. Explanation first (non-empty, before the first `##`); `## Setup`, when used, goes **last**.
2. `## Watch it happen` uses **real** seed data and shows what the real commands do.
3. `## Context`: one more idea plus a runnable example that answers a **different** question and returns something.
4. `## Task` states what to produce (keys, values, order, TTL) — never the exact command line.
5. `## Hint`: bullets that point the way; never the full command with its arguments.
6. Reads use `rows-unordered` (or `rows-ordered` when order is part of the task). **Writes use `state` with `checkQuery: SNAPSHOT <glob> [glob …]`**; the glob must match at least one key in the expected state (so `FLUSHDB` fails) and cover every key the task touches.
7. A read task whose answer is a single value must be a value the lesson's command produces naturally; the `command` column already blocks look-alikes, but avoid tasks answered by `1`/`0` alone where a related command is the natural answer.
8. Never grade on `SPOP`/`SRANDMEMBER` output or on anything the frozen clock makes misleading.
9. Teach Redis 7 forms first; give legacy forms one line.
10. Where the simulator differs from real Redis (frozen clock, exact HyperLogLog, non-blocking `B*`, simulated `CONFIG`, `#` comments), say so once, plainly.
11. Original, fictional names and data; no "Chai".

## 8. Verification
- `scripts/redisDataset.test.ts` asserts every §5 fact.
- `scripts/redisLabShape.test.ts`: 15 chapters with counts `3,3,3,3,3 · 3,4,2,3,3 · 4,3,3,3,2`, 45 lessons, animated positions `[1,5,7,10,13,16,19,23,25,27,31,33,38]`, levels, 12 problems 4/4/4 with setup/tables/example.
- `scripts/redisChecks.test.ts`: `PING`, `EXISTS nope` and `FLUSHDB` fail every `state` item; equivalent answers pass (`SET k v EX 60` = `SETEX k 60 v`; `HSET` many fields = `HMSET`; `ZRANGE … REV` = `ZREVRANGE`; any `SMEMBERS` order); a look-alike scalar (`EXISTS` for a `SISMEMBER` task) fails.
- Engine unit tests per command family, the tokenizer, transactions/WATCH, SNAPSHOT, describe grouping.
- e2e: first lesson solves with "Redis CLI"; skip banner without reload; Transcript toggle; key groups and sample; a consumer-group lesson solves; home has four live labs, no "Coming soon", and `/` loads no lab content.
- Build: entry ≤ 295 kB; separate `redis.worker-*.js` and `redis-*.js` content chunks; no `jsdelivr` in `dist`.

## 9. Out of scope
Real Redis/Docker; Pub/Sub delivery, Lua/Functions, real eviction, persistence, replication and Cluster (taught, not simulated); `BYLEX`, geospatial, JSON/Search modules; `OBJECT`, `MEMORY`, `INFO`, `CLIENT` introspection.
