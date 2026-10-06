---
id: sliding-window-limiter
title: Sliding-Window Limiter
chapter: Production Patterns
order: 9
difficulty: Hard
check: state
checkQuery: SNAPSHOT ratelimit:api:*
---

The public scores API allows each player a limited number of calls per rolling minute. Each player has a sorted set of recent requests: the member is the request ID and the score is the time it arrived, in milliseconds. The lab's clock is frozen at `1767225600000` (2026-01-01 00:00:00 UTC), and that is "now" for this problem.

A new request, `req5`, from player 101 has just arrived. Before deciding whether to allow it, the limiter must forget requests that have left the window, record the new one, and then count what is in the window.

## Tables

| Key | Type | Sample value from the Setup |
|---|---|---|
| `ratelimit:api:101` | sorted set (member = request ID, score = ms timestamp) | `req3` → 1767225555000 |
| `ratelimit:api:102` | sorted set (another player) | `req1` → 1767225500000 |

## Task

Update player 101's window, `ratelimit:api:101`, at time `1767225600000`:

1. Remove every request that is **60 seconds old or older**: any score less than or equal to `1767225540000`. A request made exactly 60 seconds ago is out of the window.
2. Add `req5` with the score `1767225600000`.
3. Give `ratelimit:api:101` a TTL of **60** seconds, so the key disappears by itself if player 101 goes quiet.
4. Finish by reading how many requests are now in the window.

The check compares the final state of every `ratelimit:api:*` key. Player 102's window belongs to another request and must not change, even though it has old entries too.

## Example

**Input**

```text
ratelimit:api:101 = { req1: 1767225480000, req2: 1767225540000, req3: 1767225555000, req4: 1767225590000 }
ratelimit:api:102 = { req1: 1767225500000, req2: 1767225598000 }
```

**Output** (every `ratelimit:api:*` key afterwards)

```text
key                type  ttl  value
ratelimit:api:101  zset  60   [[req3, 1767225555000], [req4, 1767225590000], [req5, 1767225600000]]
ratelimit:api:102  zset  -1   [[req1, 1767225500000], [req2, 1767225598000]]
```

The final count reply is `3`.

**Explanation:** `req1` is two minutes old and `req2` is exactly 60 seconds old, so both leave the window. `req3` and `req4` are still inside it, and `req5` joins them, giving 3 requests. Using an exclusive bound would keep `req2` and report 4, which could wrongly push the player over a limit. Player 102 is not part of this request, so its stale `req1` stays until that player's own limiter runs.

## Hint

- Sorted sets can drop members by score range; an open lower bound reaches every older score.
- Score bounds are inclusive unless you mark them otherwise, and that matters for the request sitting exactly on the edge.
- The count you need is the size of the set once the trim and the insert are both done.

## Setup

```redis
ZADD ratelimit:api:101 1767225480000 req1 1767225540000 req2 1767225555000 req3 1767225590000 req4
ZADD ratelimit:api:102 1767225500000 req1 1767225598000 req2
```

## Solution

```redis
ZREMRANGEBYSCORE ratelimit:api:101 -inf 1767225540000
ZADD ratelimit:api:101 1767225600000 req5
EXPIRE ratelimit:api:101 60
ZCARD ratelimit:api:101
```
