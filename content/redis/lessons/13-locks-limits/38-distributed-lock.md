---
id: distributed-lock
title: A distributed lock
chapter: Locks & Rate Limiters
order: 1
dataset: platform
check: state
checkQuery: SNAPSHOT lock:*
---

When the same user taps "Buy" twice, two app servers can start the same checkout at once and charge the wallet twice. A database transaction does not help if the two requests run on different servers that each read the wallet before either writes. A short-lived lock in Redis serialises them: whoever creates the lock key first proceeds, everyone else backs off.

Acquire with one command: `SET lock:checkout:101 <token> NX EX 30`. `NX` creates the key only if it does not exist, so exactly one caller gets `OK` and the rest get nil. `EX 30` is the lease: if the holder crashes, the lock disappears after 30 seconds instead of blocking that user's checkouts forever. Never split this into `SETNX` followed by `EXPIRE`; a crash between the two leaves a lock with no expiry. The value is a random token unique to this attempt, not just `1`, because releasing depends on it.

Releasing is where most hand-rolled locks break. A plain `DEL` can delete someone else's lock: your process stalls in a long GC pause, the lease expires, another server acquires the lock, and then your `DEL` removes their lock. Safe release checks the token and deletes in one atomic step, which needs a server-side Lua script:

```lua
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
```

You would run it with `EVAL <script> 1 lock:checkout:101 <token>`. Doing `GET` then `DEL` from the client leaves a gap between the two in which the lock can change hands. The lab does not run Lua, so this lesson practises acquisition. Keep in mind that a single-node lock is advisory: if the lease can expire while you still work, use fencing tokens or a database constraint for anything that must never happen twice.

## Watch it happen

```yaml
tables:
  lock_empty:
    label: lock:* -- before checkout starts
    columns: [key, value, ttl]
    rows: []
  attempts:
    label: two servers race for the same lock
    columns: [server, command, reply]
    rows:
      - [A, "SET lock:checkout:101 tok-a91f NX EX 30", OK]
      - [B, "SET lock:checkout:101 tok-5d20 NX EX 30", "(nil)"]
  lock_held:
    label: lock:* -- after both attempts
    columns: [key, value, ttl]
    rows:
      - ["lock:checkout:101", tok-a91f, 30]
steps:
  - label: No lock yet
    caption: "The seeded data has no lock:* keys, so the first SET NX for user 101 will succeed."
    show: [lock_empty]
  - label: Server A acquires
    caption: "Server A sends its token with NX and a 30-second lease, and gets OK."
    show: [attempts]
    highlight: [{ table: attempts, row: 1, tone: kept }]
  - label: Server B is refused
    caption: "Server B's NX attempt finds the key already there and gets nil. It must not proceed with the checkout."
    show: [attempts]
    highlight: [{ table: attempts, row: 2, tone: removed }]
    notes:
      - { title: "Without NX", text: "A plain SET would have replaced tok-a91f with tok-5d20, and both servers would think they hold the lock.", tone: removed }
  - label: One owner, bounded lifetime
    caption: "The lock holds server A's token with a TTL of 30, so it frees itself even if A never releases it."
    show: [lock_held]
    highlight: [{ table: lock_held, row: 1, tone: focus }]
```

## Context

Before doing slow work, a lock holder can confirm the lock still carries its own token. Here a nightly report job takes its lock and reads the value back; a different token would mean its lease expired and someone else owns the job now:

```redis
SET lock:report:daily job-881 NX EX 60
GET lock:report:daily
```

## Task

Acquire the checkout lock `lock:checkout:101` for server A with the token `tok-a91f`, only if nobody holds it, with a 30-second lease. Then run server B's attempt to take the same lock with the token `tok-5d20` in the same way. B's attempt must fail and leave A's token and lease in place.

## Hint

- Both attempts need the option that refuses to overwrite an existing key.
- The lease goes in the same command as the token, not in a second call.
- After both lines, the lock should still carry the first token.

## Solution

```redis
SET lock:checkout:101 tok-a91f NX EX 30
SET lock:checkout:101 tok-5d20 NX EX 30
```
