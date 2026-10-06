---
id: memory-eviction
title: Memory and eviction
chapter: Redis in Production
order: 1
dataset: platform
check: state
checkQuery: SNAPSHOT cache:*
---

Redis keeps every key in RAM, so memory is the budget you manage. `maxmemory` sets the ceiling (for example `CONFIG SET maxmemory 2gb`; `0` means no limit, the default on 64-bit builds), and `maxmemory-policy` decides what happens when a write would go over it. With the default `noeviction`, Redis refuses new writes with an `OOM command not allowed` error while reads keep working. That is the right choice when Redis holds data you cannot lose, such as queues or sessions, and the wrong one for a pure cache.

There are eight policies. `allkeys-lru`, `allkeys-lfu` and `allkeys-random` may evict any key: least recently used, least frequently used, or at random. `volatile-lru`, `volatile-lfu`, `volatile-random` and `volatile-ttl` consider only keys that have an expiry, and `volatile-ttl` picks the ones closest to expiring. `noeviction` completes the list. For a dedicated cache, `allkeys-lru` or `allkeys-lfu` is the usual answer. The `volatile-*` family lets one instance mix a cache with permanent data, on the understanding that only TTL keys are fair game.

That understanding is where incidents start. Under any `volatile-*` policy, a key without a TTL can never be evicted. One forgotten `EXPIRE` on a cache write, repeated across millions of keys, quietly fills the instance with entries the policy is not allowed to touch, until Redis has nothing it may evict and starts rejecting writes as if it were `noeviction`. The fix is an audit: walk the keyspace with `SCAN` (never `KEYS` in production), check `TTL` on each cache key, and give the strays an expiry.

The lab stores both settings, so `CONFIG GET maxmemory-policy` really returns `noeviction` for the seeded data, but it never evicts anything; there is no memory pressure in a browser tab. The audit you run below is exactly what you would do against a real server.

## Context

The same audit applies to sessions. Scanning `session:*` lists seven keys, and checking one of the old ones shows it has no expiry at all, so under a `volatile-*` policy it could never be evicted:

```redis
CONFIG GET maxmemory-policy
SCAN 0 MATCH session:* COUNT 100
TTL session:legacy
```

## Task

The team is about to switch this instance to `volatile-lru`. Audit the `cache:*` keys: find them with a cursor scan and check each one's remaining lifetime. Exactly one cache key has no expiry; give that key a 10-minute TTL. Do not change the value of any key or the TTL of the cache key that already has one.

## Hint

- Scan with a pattern for the cache prefix rather than listing every key.
- A TTL reply of `-1` means the key exists but never expires.
- Ten minutes, in seconds, goes only on the key that had none.

## Solution

```redis
SCAN 0 MATCH cache:* COUNT 100
TTL cache:game:3
TTL cache:featured
EXPIRE cache:featured 600
```
