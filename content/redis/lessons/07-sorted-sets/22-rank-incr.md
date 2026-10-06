---
id: rank-incr
title: Ranks and increments
chapter: Sorted Sets
order: 4
dataset: platform
check: state
checkQuery: SNAPSHOT leaderboard:global
---

When a player on ArcadePulse completes a quest, the game server adds XP to their total. A naive server reads the score with `ZSCORE`, adds in application code and writes it back with `ZADD`. Two quests finishing at the same moment can then overwrite each other and lose XP. `ZINCRBY` does the addition **inside Redis**, atomically, so concurrent awards always add up.

`ZINCRBY key increment member` adds `increment` (which may be negative or a decimal) to the member's score and replies with the **new score**. If the member is missing, it is created with the increment as its score. Mind the argument order: the number comes **before** the member, which is the opposite of `HINCRBY key field increment`.

```redis
ZINCRBY leaderboard:global 25 112
```

Elena (112) had 245, so the reply is `"270"`. Scores come back as strings, because Redis stores them as floating-point numbers.

To show "you are #3", use `ZRANK key member` (0-based, lowest score is 0) or `ZREVRANK key member` (0-based from the top). In real Redis, `ZREVRANK leaderboard:global 103` replies `0`, because Yuki leads the board, so add 1 before you display it. `ZADD key INCR increment member` is an alternative spelling of `ZINCRBY` that also accepts the `NX`/`XX`/`GT`/`LT` flags.

## Context

A daily login bonus of 50 XP goes to Leila (player 110). The award is a single atomic call, and its reply is her new total, ready to show in the toast message:

```redis
ZINCRBY leaderboard:global 50 110
```

## Task

Sofia (player `108`) just won a tournament round. Award her **120 XP** on `leaderboard:global` by adding to her current score, not by typing in a new total. No other player's score may change.

## Hint

- Use the sorted-set command that adds to a score and returns the result.
- The amount goes before the player id.
- Her new score should be 790, which lifts her above the two players tied at 760.

## Solution

```redis
ZINCRBY leaderboard:global 120 108
```
