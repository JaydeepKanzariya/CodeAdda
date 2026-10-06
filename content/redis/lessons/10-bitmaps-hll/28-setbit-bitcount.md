---
id: setbit-bitcount
title: One bit per user
chapter: Bitmaps & HyperLogLog
order: 1
dataset: platform
check: rows-unordered
---

The ArcadePulse growth team wants daily active users: who played on each day, and how many. Storing a set of user ids per day works, but each member costs dozens of bytes. When user ids are small, dense integers, a **bitmap** is far cheaper: one bit per user, where bit number 101 says whether user 101 was active. Ten million users fit in about 1.2 MB per day.

A bitmap is not a separate type; it is an ordinary string that Redis lets you address bit by bit, so `TYPE` reports `string`.

- `SETBIT key offset 0|1` sets one bit and replies with the bit's **previous** value.
- `GETBIT key offset` reads one bit; bits never set read as 0.
- `BITCOUNT key` counts the bits that are 1.

```redis
SETBIT active:2026-01-04 102 1
```

The reply is `0`, because Mateo (102) had not been marked active on the 4th until now.

Two pitfalls. First, the string grows to reach the highest offset you set: one `SETBIT` at offset 4,000,000,000 allocates about 500 MB at once, so bitmaps only suit dense ids that start near zero. Second, the optional `start end` arguments of `BITCOUNT` are **byte** positions, not bit positions, unless you add `BIT` (Redis 7). `BITCOUNT key 12 12` counts the 8 bits of byte 12, which are user ids 96 to 103.

## Context

The weekly report also needs the last day of the week. Counting the set bits in that day's bitmap gives the number of distinct active players on January 7th:

```redis
BITCOUNT active:2026-01-07
```

## Task

Each day's activity is stored in a bitmap named `active:<date>`, with one bit per user id. Return **how many users** were active on **2026-01-03**.

## Hint

- You need a total for the whole day, not the state of one user's bit.
- One command counts every bit set to 1 in a key.
- The answer is a single number; four players were online that day.

## Solution

```redis
BITCOUNT active:2026-01-03
```
