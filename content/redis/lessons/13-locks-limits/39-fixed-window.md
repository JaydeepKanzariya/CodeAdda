---
id: fixed-window
title: Fixed-window limiter
chapter: Locks & Rate Limiters
order: 2
dataset: platform
check: state
checkQuery: SNAPSHOT ratelimit:fixed:*
---

The simplest rate limiter counts requests per client per time bucket. Put the bucket in the key name, for example `ratelimit:fixed:101:2026-01-01T00:00` for user 101 during the minute starting at midnight, and `INCR` it on every request. `INCR` creates a missing key at 0 before adding one and returns the new count, so the reply is all you need: if it is above the limit, reject the request. When the minute rolls over, the application builds a new key name and the count starts fresh.

Old buckets must clean themselves up, so the key needs an expiry, and this is where a well-known bug lives. Writing `INCR` and then `EXPIRE` as two separate round trips means a crash, timeout or deploy between them leaves a counter with no TTL. That key lives forever, and if your key names do not include the window, the client stays blocked for good. Send both inside `MULTI` … `EXEC` so they are applied together.

Use `EXPIRE key 60 NX`. The `NX` flag (Redis 7) sets the TTL only when the key has none, so the first request in the window starts the 60-second clock and later requests do not keep pushing it back. Without `NX`, every request resets the expiry, and a client who keeps calling extends its own window.

Fixed windows have a known weakness: a client can send a full quota at 00:00:59 and another full quota at 00:01:00, double the limit within two seconds. When that burst matters, use the sliding window from the next lesson. For coarse protection, fixed windows are cheap and perfectly adequate.

## Context

Login protection works the same way with a longer window. A transaction counts a failed sign-in from one IP for a 15-minute bucket, and the `EXEC` reply shows the new count and that the expiry was set:

```redis
MULTI
INCR ratelimit:login:203.0.113.9
EXPIRE ratelimit:login:203.0.113.9 900 NX
EXEC
```

## Task

User 101 makes an API request in the minute that starts at 2026-01-01 00:00. Count it in the fixed-window counter `ratelimit:fixed:101:2026-01-01T00:00`, and give the counter a 60-second expiry only if it does not already have one. Apply the count and the expiry together as one transaction.

## Hint

- The counter key does not exist yet; the increment creates it.
- The expiry flag that only sets a TTL when there is none is the Redis 7 way to avoid pushing the window back.
- Wrap both commands so they cannot be separated by a crash.

## Solution

```redis
MULTI
INCR ratelimit:fixed:101:2026-01-01T00:00
EXPIRE ratelimit:fixed:101:2026-01-01T00:00 60 NX
EXEC
```
