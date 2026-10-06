---
id: invalidation
title: Keeping caches fresh
chapter: Caching Patterns
order: 2
dataset: platform
check: state
checkQuery: SNAPSHOT game:3 cache:*
---

A cache is a copy, and a copy goes stale the moment the original changes. The standard fix is invalidate-on-write: every code path that changes the source of truth also deletes the cache keys derived from it. The next reader misses, reloads the fresh row and refills the cache through the normal cache-aside path. Write first, then delete; deleting first lets a concurrent reader refill the cache with the old value before your write lands.

Why delete instead of writing the new value into the cache? Because two writers can finish in either order. If writer A sets price 5.99 and writer B sets 6.49, but their cache updates arrive B then A, the cache says 5.99 while the database says 6.49, with no expiry to save you if the key has none. A delete has no such ordering problem: whichever runs last, the key is simply gone. `DEL` removes keys synchronously; `UNLINK` returns immediately and frees the memory in the background, which is the better choice for large values.

Invalidation is only as good as your list of derived keys. A price change on game 3 makes `cache:game:3` stale, but it may also affect a "featured games" block, a search result page or a genre listing. Teams usually keep that mapping in one function next to the write, because invalidation scattered across handlers is where bugs hide.

Keep the TTL even when you invalidate. Writes get lost: a deploy kills a process between the database commit and the `DEL`, or a script updates rows directly in the database. The TTL is the backstop that bounds how long such a miss can serve wrong data.

## Context

One write can make a different cache stale too. `cache:featured` holds the featured game, which is game 7, so raising game 7's price also drops that block, and `UNLINK` reports the one key it removed:

```redis
HSET game:7 price 34.99
UNLINK cache:featured
```

## Task

Game 3 goes on sale. In its catalog hash `game:3`, change `price` to `5.99`, leaving the other fields alone. Then invalidate the game's cached page at `cache:game:3` so the next reader reloads it. Do not rewrite the cache with a new value, and leave every other cache key as it is.

## Hint

- Update the source of truth first, and touch only the price field.
- Removing the cached copy is safer than overwriting it with a new value.
- Either the synchronous or the background delete command is fine here.

## Solution

```redis
HSET game:3 price 5.99
DEL cache:game:3
```
