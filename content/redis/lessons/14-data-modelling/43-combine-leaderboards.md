---
id: combine-leaderboards
title: Combining leaderboards
chapter: Data Modelling
order: 3
dataset: platform
check: state
checkQuery: SNAPSHOT leaderboard:week:*
---

Real leaderboards are rarely one number. ArcadePulse tracks weekly XP in `leaderboard:week:2026-01` and event bonus points in `bonus:week:2026-01`, and the final standings combine the two. Pulling both sets into application code, merging and re-sorting works, but Redis can do it in one command and store the result as a new sorted set that every page can read with `ZRANGE`.

`ZUNIONSTORE destination numkeys key [key ...] [WEIGHTS w ...] [AGGREGATE SUM|MIN|MAX]` takes every member that appears in any input. Each input score is multiplied by that input's weight, then the scores are combined, by sum unless you choose otherwise. A member missing from one input simply contributes nothing from it. `numkeys` must match the number of keys you list, and the weights are given in the same order as the keys. The reply is the size of the new set.

Concretely, with weights `1 2` user 101 ends with 1120 + 2 × 10 = 1140, and user 106, who has no bonus, keeps 760. `ZINTERSTORE` is the sibling that keeps only members present in every input; use it for "players active in both events", not for totals, because here it would silently drop the three players with no bonus. `AGGREGATE MAX` answers a different question again: each player's best single score.

Two production notes. The destination is overwritten entirely, so never point it at one of your live inputs unless you mean to replace it. And the stored result is a snapshot, not a view: it does not change when the inputs do, so rebuild it when the week closes (or on a schedule) and give it an expiry if it is only a temporary rollup.

## Context

Taking each player's larger value instead of a weighted sum is a different rollup. With `AGGREGATE MAX` nobody's bonus can beat their XP, so the stored board simply mirrors the weekly XP, top three shown:

```redis
ZUNIONSTORE board:best:2026-01 2 leaderboard:week:2026-01 bonus:week:2026-01 AGGREGATE MAX
ZRANGE board:best:2026-01 0 2 REV WITHSCORES
```

## Task

Close the week. Store the final board at `leaderboard:week:final`, combining every player from `leaderboard:week:2026-01` and `bonus:week:2026-01`, where weekly XP counts once and bonus points count double. Players without a bonus must still appear. Leave both inputs unchanged.

## Hint

- You want every member from either input, so choose the union, not the intersection.
- Weights follow the order of the keys you list.
- The default way scores combine is already the one you want.

## Solution

```redis
ZUNIONSTORE leaderboard:week:final 2 leaderboard:week:2026-01 bonus:week:2026-01 WEIGHTS 1 2
```
