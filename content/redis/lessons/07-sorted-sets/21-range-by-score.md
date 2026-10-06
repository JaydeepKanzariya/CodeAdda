---
id: range-by-score
title: Reading by score
chapter: Sorted Sets
order: 3
dataset: platform
check: rows-ordered
---

Ranks answer "who is in 3rd place?", but many ArcadePulse features ask about score values instead: "which players are in the Gold league, 900 XP and up?" or "who is just above me?". For those you read the sorted set **by score**, not by position.

Add `BYSCORE` and the two bounds of `ZRANGE` become scores: `ZRANGE key min max BYSCORE [REV] [LIMIT offset count] [WITHSCORES]`. Bounds are inclusive by default. Put `(` in front of a bound to make it **exclusive**, and use `-inf` or `+inf` for an open end.

```redis
ZRANGE leaderboard:global 400 600 BYSCORE
```

That returns `104` (430) and `110` (520), lowest score first. Writing `(400` would make no difference here, but `(430` would drop player 104, because 430 itself is no longer allowed.

`LIMIT offset count` pages through a score range, like SQL's `OFFSET … LIMIT`, and it only works together with `BYSCORE` (or `BYLEX`). Watch the bounds when you add `REV`: Redis then expects the **higher bound first**, so it is `+inf 1000`, not `1000 +inf`. Getting this backwards returns an empty list rather than an error.

The older `ZRANGEBYSCORE` and `ZREVRANGEBYSCORE` commands do the same job and appear in lots of existing code.

## Context

The Diamond league starts at 1000 XP. To list its members from the strongest down, read by score in reverse, remembering that the high bound now comes first:

```redis
ZRANGE leaderboard:global +inf 1000 BYSCORE REV WITHSCORES
```

## Task

The "next challenger" panel shows the players just above a score of 760. From `leaderboard:global`, return the **first 3** players whose score is **strictly greater than 760** (760 itself does not count), with their scores, lowest score first.

## Hint

- Read by score with no upper limit, and make the lower bound exclude 760.
- An exclusive bound is written by putting a parenthesis directly in front of the number.
- Cap the result at three rows with the paging option, starting at offset 0.

## Solution

```redis
ZRANGE leaderboard:global (760 +inf BYSCORE LIMIT 0 3 WITHSCORES
```
