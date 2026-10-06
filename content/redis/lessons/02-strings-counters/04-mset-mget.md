---
id: mset-mget
title: Many keys at once
chapter: Strings & Counters
order: 1
dataset: platform
check: rows-ordered
---

The ArcadePulse home page shows a view count under every game tile. Fetching eight counters with eight `GET`s means eight network round trips, and on a busy server the waiting adds up far faster than the work. `MGET key [key ...]` reads many string keys in one request and returns the values in exactly the order you asked for them.

Its partner `MSET key value [key value ...]` writes several strings in one step. It is atomic: other clients see either none of the new values or all of them, never half. Both commands only deal with plain string values.

```
redis> MGET views:game:1 views:game:8
1) "120"
2) "160"
redis> MSET wallet:101 500 wallet:102 120
OK
```

Each position in the reply belongs to the key at the same position in the request. A missing key, or a key that holds something other than a string, comes back as `(nil)` in its slot instead of failing the whole call, so always pair results with keys by position, not by skipping blanks.

The pitfall on the writing side: `MSET` overwrites every key it names, and has no per-key option to protect existing values. Its cousin `MSETNX` writes all of the pairs only if none of the keys exist yet; if even one exists it writes nothing and replies `0`.

## Context

A missing key doesn't break the batch. Wallet 999 doesn't exist, so it gets a `(nil)` in the third slot while the real wallets still come back:

```redis
MGET wallet:101 wallet:102 wallet:999
```

## Task

The "Top picks" strip shows Moonforge, Driftline and Byte Brigade (games 2, 5 and 7). Return their view counts in one request, in that order: game 2, then game 5, then game 7.

## Hint

- View counts live in keys named after the game id, under the `views:` prefix.
- The reply order follows the order of the names you pass, so list them as the strip shows them.

## Solution

```redis
MGET views:game:2 views:game:5 views:game:7
```
