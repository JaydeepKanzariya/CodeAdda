---
id: sliding-window
title: Sliding-window limiter
chapter: Locks & Rate Limiters
order: 3
dataset: platform
check: state
checkQuery: SNAPSHOT ratelimit:api:*
---

A sliding-window limiter answers the question "how many requests did this client make in the last 60 seconds, measured from right now?" There are no bucket boundaries to game. The usual Redis shape is one sorted set per client where every request is a member and its timestamp in milliseconds is the score. ArcadePulse keeps user 101's API calls in `ratelimit:api:101`.

Each request runs three steps. First trim: `ZREMRANGEBYSCORE key -inf (<now - 60000>` removes everything older than the window. Then record: `ZADD key <now> <request-id>`. Then count: `ZCARD key` returns how many requests remain in the window, and the application compares that with the limit. Real implementations put the three in one `MULTI` and add an `EXPIRE` of the window length, so an idle client's set does not linger.

Order matters. If you count before trimming, every old entry still counts against the client and they get rejected for requests made long ago. If you never trim at all, the set grows without bound and the limiter turns into a lifetime cap. The `(` in front of a bound makes it exclusive, which is how you say "strictly older than" rather than "at or before".

Two practical details. Members must be unique, so use a request ID rather than the timestamp alone, or two calls in the same millisecond collapse into one. And the cost is memory: one member per request per client, so this suits limits of tens or hundreds per window, not millions. The lab's clock is frozen at `1767225600000`, which makes "now minus 60 seconds" exactly `1767225540000`.

## Context

An upload limiter for user 104 holds three uploads, one of them older than a minute. Trimming at the exclusive bound drops just that one, and counting afterwards shows what is left in the window:

```redis
ZADD ratelimit:upload:104 1767225500000 up-1 1767225550000 up-2 1767225590000 up-3
ZREMRANGEBYSCORE ratelimit:upload:104 -inf (1767225540000
ZCARD ratelimit:upload:104
```

## Task

User 101 makes a new API request now, at `1767225600000`. In `ratelimit:api:101`, first drop every request older than 60 seconds before now, then record the new request as member `req5` with the current time as its score. Every seeded request in that set is far older than a minute. Skip the key expiry for this exercise so the check sees only the trim and the new entry.

## Hint

- Remove by score, using now minus 60 000 milliseconds as the upper bound.
- Trim before you record, or the old entries are still counted.
- The new member's score is the current time in milliseconds.

## Solution

```redis
ZREMRANGEBYSCORE ratelimit:api:101 -inf (1767225540000
ZADD ratelimit:api:101 1767225600000 req5
ZCARD ratelimit:api:101
```
