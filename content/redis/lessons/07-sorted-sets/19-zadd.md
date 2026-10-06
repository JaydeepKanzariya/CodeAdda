---
id: zadd
title: Scores and members
chapter: Sorted Sets
order: 1
dataset: platform
check: state
checkQuery: SNAPSHOT leaderboard:global
---

The ArcadePulse global leaderboard needs two things a plain set cannot give: a number attached to each player, and the players kept in order of that number. A **sorted set** does both. Every member is unique, like a set, and each carries a floating-point **score**. Redis keeps the members sorted by score at all times, so reading the top ten never needs a sort.

`ZADD key [NX|XX] [GT|LT] [CH] score member [score member ...]` writes scores. Note the order: **score first, then member**. Writing `ZADD leaderboard:global 113 500` creates a player called `500` with 113 points, which is a quiet and common mistake.

```redis
ZADD leaderboard:global 500 113
```

The reply is `1`, meaning one new member was added. By default `ZADD` counts only members that did not exist before; add `CH` to count changed scores as well.

The flags decide what may change:

- `NX` only adds new members and never touches existing scores. `XX` only updates members that already exist.
- `GT` only updates a score when the new one is **greater**; `LT` only when it is lower. New members are still added.

`GT` is the "personal best" switch: a worse run never lowers a player's score, so a slow game can't overwrite a record. Without it, `ZADD` simply overwrites, and a bad game would drop a player down the board.

## Watch it happen

```yaml
tables:
  before:
    label: leaderboard:global -- three players before the update
    columns: [member, score]
    rows:
      - ["101", 980]
      - ["103", 1120]
      - ["108", 670]
  submitted:
    label: new runs submitted with GT
    columns: [member, new_run, rule]
    rows:
      - ["101", 1000, "1000 > 980, update"]
      - ["103", 1100, "1100 < 1120, keep old"]
      - ["108", 700, "700 > 670, update"]
  after:
    label: leaderboard:global -- after ZADD GT
    columns: [member, score]
    rows:
      - ["101", 1000]
      - ["103", 1120]
      - ["108", 700]
steps:
  - label: Current best scores
    caption: "Players 101, 103 and 108 each have a best score on the global board."
    show: [before]
  - label: Compare each new run
    caption: "With GT, Redis compares every submitted score against the stored one before writing."
    show: [before, submitted]
    highlight: [{ table: submitted, row: 2, tone: focus }]
    notes:
      - { title: "GT never lowers", text: "Yuki's 1100 is below her 1120, so that pair is skipped without an error." }
  - label: Only improvements land
    caption: "101 and 108 move up; 103 keeps 1120. The reply is 0 because no new members were added, only scores changed."
    show: [after]
    highlight: [{ table: after, row: 1, tone: kept }, { table: after, row: 3, tone: kept }]
```

## Context

When a player is imported from an old system, the import must never overwrite a score they already earned on ArcadePulse. `NX` adds only the brand-new player 113 and leaves 101 alone, which the score lookup confirms:

```redis
ZADD leaderboard:global NX 990 101 300 113
ZSCORE leaderboard:global 101
```

## Task

Three games just finished. Player `101` scored 1000, player `103` scored 1100 and player `108` scored 700. Record these on `leaderboard:global` so that a score only replaces the stored one when it is **higher**. No player's score may go down, and no other member may change.

## Hint

- One flag makes `ZADD` keep the larger of the old and the new score.
- Each pair is written score first, then the player id.
- Afterwards player 103 should still have 1120.

## Solution

```redis
ZADD leaderboard:global GT 1000 101 1100 103 700 108
```
