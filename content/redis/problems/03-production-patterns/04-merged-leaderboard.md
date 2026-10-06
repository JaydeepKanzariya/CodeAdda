---
id: merged-leaderboard
title: Merged Leaderboard
chapter: Production Patterns
order: 12
difficulty: Hard
check: rows-ordered
---

The January cup ranks players on two sorted sets: match points, and bonus points earned from weekly challenges. The rules say a bonus point is worth **twice** a match point. Several thousand players are in the cup, so the combined table should be built inside Redis and stored, and the broadcast overlay then reads the top of it.

## Tables

| Key | Type | Sample value from the Setup |
|---|---|---|
| `points:week:2026-01` | sorted set (match points) | `bob` → 20 |
| `bonus:week:2026-01` | sorted set (bonus points) | `erin` → 6 |
| `points:week:2025-52` | sorted set (last week, not used) | `dan` → 31 |

## Task

1. Store the combined standings in `leaderboard:week:2026-01`. A player's combined score is their match points plus **2 ×** their bonus points. A player missing from one of the two sets counts 0 there, so players who appear in only one set still take part.
2. Return the **top 3** of `leaderboard:week:2026-01`, highest first, with columns `member` and `score`.

## Example

**Input**

```text
points:week:2026-01 = { bob: 20, carol: 13, dan: 11, alice: 10 }
bonus:week:2026-01  = { erin: 6, bob: 3, alice: 2 }
points:week:2025-52 = { dan: 31, carol: 18 }
```

**Output**

```text
member score
bob 26
alice 14
carol 13
```

**Explanation:** bob has 20 + 2 × 3 = 26 and alice has 10 + 2 × 2 = 14. carol has no bonus, so she keeps 13; erin has only a bonus and gets 2 × 6 = 12, which puts her fourth, just ahead of dan on 11. Without the weighting, alice would total only 12 and fall behind carol, so the order would change. Keeping only players found in both sets would drop carol from the podium.

## Hint

- One command can add several sorted sets together and store the result, and it accepts a multiplier per input set.
- Players in only one set must survive the merge, which rules out an intersection.
- Read the stored set from the highest score down, with scores.

## Setup

```redis
ZADD points:week:2026-01 20 bob 13 carol 11 dan 10 alice
ZADD bonus:week:2026-01 6 erin 3 bob 2 alice
ZADD points:week:2025-52 31 dan 18 carol
```

## Solution

```redis
ZUNIONSTORE leaderboard:week:2026-01 2 points:week:2026-01 bonus:week:2026-01 WEIGHTS 1 2
ZRANGE leaderboard:week:2026-01 0 2 REV WITHSCORES
```
