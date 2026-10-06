---
id: weekly-podium
title: Weekly Podium
chapter: Everyday Redis
order: 6
difficulty: Medium
check: rows-ordered
---

Every Monday the squad league shows a three-step podium on the home page. Squad points for the week live in a sorted set. This week two squads finished level, and the designers want the podium to show exactly what a descending read of the sorted set returns, ties included.

## Tables

| Key | Type | Sample value from the Setup |
|---|---|---|
| `squads:week:2026-01` | sorted set (member = squad, score = points) | `alpha` → 100 |
| `squads:week:2025-52` | sorted set (last week, not used) | `delta` → 140 |

## Task

From `squads:week:2026-01`, return the **top 3** squads, highest points first, with columns `member` and `score`.

When two squads have the same points, order them the way Redis orders equal scores in a highest-first read: the squad whose name sorts **later** alphabetically comes first.

## Example

**Input**

```text
squads:week:2026-01 = { alpha: 100, beta: 90, gamma: 90, delta: 85, epsilon: 70 }
squads:week:2025-52 = { delta: 140, alpha: 120, beta: 60 }
```

**Output**

```text
member score
alpha 100
gamma 90
beta 90
```

**Explanation:** `alpha` leads with 100. `beta` and `gamma` share 90, and a reversed range reverses the whole order, so the alphabetical tie-break flips too: `gamma` comes before `beta`. `delta` (85) is clearly fourth, so nothing is tied at the cut-off. Listing the same three squads lowest first, or reading last week's set, gives a different podium.

## Hint

- Sorted-set ranges can be read from the highest score down, and can include each member's score.
- Ranks are zero-based and both ends are included, so think about which ranks make a top 3.

## Setup

```redis
ZADD squads:week:2026-01 100 alpha 90 beta 90 gamma 85 delta 70 epsilon
ZADD squads:week:2025-52 140 delta 120 alpha 60 beta
```

## Solution

```redis
ZRANGE squads:week:2026-01 0 2 REV WITHSCORES
```
