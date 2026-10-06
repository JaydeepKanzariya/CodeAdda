---
id: range-by-rank
title: Reading by rank
chapter: Sorted Sets
order: 2
dataset: platform
check: rows-ordered
---

The leaderboard page on ArcadePulse shows positions: first place, second place, and so on. In a sorted set each member has a **rank**, its zero-based position in score order, and `ZRANGE` reads a slice of members by rank.

`ZRANGE key start stop [REV] [WITHSCORES]` returns members from index `start` to index `stop`, **both inclusive**. Index 0 is the lowest score; add `REV` to count from the highest instead. Negative indexes count from the end, so `0 -1` means everything. `WITHSCORES` returns each member with its score, which this lab shows as `member, score` rows.

```redis
ZRANGE leaderboard:global 0 2 WITHSCORES
```

Without `REV` this gives the three **lowest** players: 112 (245), 107 (315) and 104 (430). Forgetting `REV` is the most common leaderboard bug, and the second is an off-by-one: `0 5` returns six members, not five.

Equal scores are ordered by member name, byte by byte. Players 102 and 111 both have 760, so in ascending order 102 comes before 111. `REV` flips the entire list, ties included, so with `REV` you see **111 before 102**. If your product needs a different tie rule, such as "whoever got there first", it has to be encoded in the score.

Older code uses `ZREVRANGE key start stop WITHSCORES`, which is the same as `ZRANGE … REV` and still works, but new code should use `ZRANGE` with `REV`.

## Context

Positions 6 to 9 on the board sit just below the podium area, and they include the board's only tie. Zero-based, those are indexes 5 to 8, read from the top:

```redis
ZRANGE leaderboard:global 5 8 REV WITHSCORES
```

## Task

Return the **top 5** players on `leaderboard:global` with their scores, highest score first.

## Hint

- Ranks start at 0, and the stop index is included in the result.
- By default the range starts from the lowest score; one option starts it from the highest.
- Ask for the scores too, so each row shows a member and a score.

## Solution

```redis
ZRANGE leaderboard:global 0 4 REV WITHSCORES
```
