---
id: cache-aside
title: Cache-aside
chapter: Caching Patterns
order: 1
dataset: platform
check: state
checkQuery: SNAPSHOT cache:*
---

Cache-aside (also called lazy loading) is the caching pattern you will meet most often. The application owns the logic: on a read it asks Redis first; on a hit it returns the cached value; on a miss it loads from the system of record, writes the result into Redis with an expiry, and returns it. Redis never talks to the database itself. Only data that someone actually asked for gets cached, and a Redis outage degrades to slower reads instead of failures.

In ArcadePulse the game catalog hashes (`game:*`) stand in for the database, and rendered values live under `cache:*`. A hit looks like `GET cache:game:3`, which returns `"Pixel Orchard details"`. A miss returns nil, and the fill is a single `SET cache:game:5 <value> EX <seconds>`, which writes the value and its lifetime in one atomic command. `SETEX` is the older spelling of the same thing.

The TTL is not optional. A cache entry without one lives until someone deletes it, so any missed invalidation becomes permanently wrong data, and under the `volatile-*` eviction policies (lesson 44) a key with no TTL can never be evicted. Pick the TTL from how stale the business can tolerate: minutes for a price, seconds for stock levels.

There is a subtle race. Reader A misses and loads the old row; a writer updates the database and deletes the cache key; then A finishes and writes the old value into the cache, where it stays until the TTL runs out. Short TTLs bound how long that can last, and the next lesson shows why writers delete instead of overwrite. The opposite bug is filling the cache before the database write has committed, which publishes a value that may then be rolled back.

## Context

Before deciding whether to rebuild, a reader can check how long a hit still has to live. Game 3's cached page is a hit, and its remaining lifetime is the full five minutes it was stored with:

```redis
GET cache:game:3
TTL cache:game:3
```

## Task

A request for game 5 has just missed the cache: `cache:game:5` does not exist. You have loaded the game's title from `game:5`. Cache that title, exactly `Driftline`, as a string at `cache:game:5` with a lifetime of 5 minutes, written atomically with its expiry. Change no other cache key.

## Hint

- Confirm the miss and read the title from the game hash before you write anything.
- The value and its expiry belong in one command, not two.
- Five minutes has to be expressed in seconds (or milliseconds).

## Solution

```redis
GET cache:game:5
HGET game:5 title
SET cache:game:5 Driftline EX 300
```
