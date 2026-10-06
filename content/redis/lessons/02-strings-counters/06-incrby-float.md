---
id: incrby-float
title: Steps and decimals
chapter: Strings & Counters
order: 3
dataset: platform
check: state
checkQuery: SNAPSHOT views:game:4 revenue:*
---

Counting one at a time is fine for single clicks, but ArcadePulse also receives batches: a partner site reports 40 views at once, a sale adds 9.99 to the day's revenue. Calling `INCR` forty times would be silly. `INCRBY key n` adds any whole number in one atomic step, and `DECRBY key n` subtracts one. Both reply with the new value.

For amounts with a fractional part there is `INCRBYFLOAT key amount`. It accepts decimals and negative numbers (there is no `DECRBYFLOAT`, you just add a negative amount), and it replies with the new value as a string:

```
redis> INCRBY views:game:2 10
(integer) 240
redis> INCRBYFLOAT revenue:day:2026-01-01 0.5
"1500"
```

Notice the second reply: Redis tidies the result, so `1499.5 + 0.5` is stored as `"1500"`, not `"1500.0"`.

Two traps. First, the integer commands are strict about their argument too: `INCRBY views:game:2 1.5` fails with `ERR value is not an integer or out of range`. Second, floats are binary approximations, so long chains of additions can drift by tiny amounts. Many real payment systems store money as whole cents with `INCRBY` for exactly that reason; a float counter is fine for analytics like this daily revenue figure.

## Context

A negative step subtracts, so `INCRBY` alone can spend credits. Player 101 buys a 40-credit skin and the reply shows the balance left:

```redis
INCRBY wallet:101 -40
```

## Task

Two updates came in for 1 January 2026. A partner site reports 25 extra views of Neon Tactics (game 4), and a late payment of 12.75 belongs to that day's revenue in `revenue:day:2026-01-01`. Apply both, so the game's counter and the revenue figure reflect the new totals.

## Hint

- The view counter only ever holds whole numbers, so the integer version of the step command fits.
- The revenue already has a decimal part, and the integer commands would reject it.

## Solution

```redis
INCRBY views:game:4 25
INCRBYFLOAT revenue:day:2026-01-01 12.75
```
