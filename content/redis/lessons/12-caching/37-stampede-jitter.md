---
id: stampede-jitter
title: Stampedes and jitter
chapter: Caching Patterns
order: 3
dataset: platform
check: state
checkQuery: SNAPSHOT lock:* cache:*
---

Picture a popular game page cached for exactly 300 seconds. At second 300 the key expires, and in the next few milliseconds two thousand requests all miss, all run the same expensive database query and all write the same value back. That is a cache stampede (or thundering herd), and it is a classic way for a healthy database to fall over right after a deploy or a cache flush, when thousands of keys were written at the same moment and therefore expire together.

The first defence is a rebuild lock. On a miss, a request tries `SET lock:rebuild:game:6 <owner> NX EX 10`. `NX` means only the first caller gets `OK`; everyone else gets nil and either waits briefly and retries the cache, or serves a slightly stale copy if one exists. The `EX 10` matters as much as `NX`: if the rebuilder crashes, the lock frees itself after ten seconds instead of blocking rebuilds for that key forever. Set the lock's lifetime a little longer than a rebuild normally takes.

The second defence is jitter. Instead of every entry living exactly 300 seconds, add a random spread, say 300 plus a random 0 to 60 seconds, so keys written together expire across a minute rather than in the same instant. The randomness is computed in your application; Redis just receives the final number, such as `EX 317`.

A refinement used at scale is early recomputation: a reader that sees the TTL is nearly up (`TTL` below some threshold) rebuilds in the background while everyone else keeps getting the cached value. Releasing the lock safely once the rebuild finishes is its own problem, covered in the next lesson.

## Context

When a second worker arrives while the first is rebuilding game 3, its `NX` attempt returns nil. Rather than hit the database too, it falls back to the copy still in the cache:

```redis
SET lock:rebuild:game:3 worker-2 NX EX 10
SET lock:rebuild:game:3 worker-9 NX EX 10
GET cache:game:3
```

## Task

Game 6's cached page has expired and you are the worker who will rebuild it. First take the rebuild lock `lock:rebuild:game:6` with the owner value `worker-17`, only if no one holds it, for 10 seconds. Then cache the title `Lantern Vale` at `cache:game:6` with the jittered TTL your application computed: 317 seconds. Keep holding the lock (releasing it is the next lesson).

## Hint

- The lock must refuse to overwrite an existing holder and must expire by itself.
- The cache write needs its own expiry, using the jittered number rather than the round 300.
- Both keys are plain strings.

## Solution

```redis
SET lock:rebuild:game:6 worker-17 NX EX 10
HGET game:6 title
SET cache:game:6 "Lantern Vale" EX 317
```
