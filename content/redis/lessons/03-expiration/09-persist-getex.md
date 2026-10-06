---
id: persist-getex
title: Changing a key's lifetime
chapter: Expiration
order: 3
dataset: platform
check: state
checkQuery: SNAPSHOT cache:*
---

A TTL is not fixed once it is set. Product decisions change: the Pixel Orchard details that were cached for five minutes are now meant to stay until someone edits the game, and an old cache entry should disappear right now. Redis has a command for each direction.

`PERSIST key` removes the timer and keeps the value, turning the key permanent. It replies `1` when it removed a timer and `0` when there was nothing to remove (no TTL, or no key). `GETEX key` reads a string like `GET` and changes its lifetime in the same call: `GETEX key EX 600` sets a new timer, `GETEX key PERSIST` drops it. That is the natural tool for sliding expiry, where every read of a session pushes its end time back.

```
redis> PERSIST cache:game:3
(integer) 1
redis> TTL cache:game:3
(integer) -1
```

Going the other way, a timer of zero or less deletes the key on the spot: `EXPIRE key 0` behaves like `DEL` and replies `1`. The same happens with `EXPIREAT` and a time in the past. That surprises people who meant "expire soon" and computed a negative number by mistake.

The pitfall specific to `PERSIST`: a `0` reply is not an error. If you run it on a key that never had a TTL, nothing happens and the reply is `0`, so don't treat that reply as a failure.

## Context

`GETEX` with `PERSIST` reads a session and pins it in one round trip. Session gamma had an hour left; after this it keeps its value and has no end time:

```redis
GETEX session:gamma PERSIST
```

## Task

Two cache changes are due. `cache:game:3` must become permanent, keeping its current value. `cache:featured` must be removed by giving it a lifetime that ends immediately, so it no longer exists afterwards.

## Hint

- Removing a timer has its own command, and it keeps the value as it is.
- A countdown that starts at zero ends before anyone can read the key.

## Solution

```redis
PERSIST cache:game:3
EXPIRE cache:featured 0
```
