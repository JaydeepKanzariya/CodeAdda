---
id: expire-ttl
title: Keys that expire
chapter: Expiration
order: 1
dataset: platform
check: state
checkQuery: SNAPSHOT session:*
---

Memory is the most precious resource a Redis server has, and plenty of data is only useful for a while: a login session, a one-time code, a cached page. Instead of writing a cleanup job, you can give a key a time to live. `EXPIRE key seconds` starts a countdown, and when it reaches zero Redis deletes the key by itself. It replies `1` if the timer was set and `0` if the key doesn't exist.

`TTL key` tells you how many whole seconds are left. Two special replies matter: `-1` means the key exists but will never expire, and `-2` means there is no such key at all.

```
redis> TTL session:beta
(integer) 1800
redis> TTL session:orphan
(integer) -1
```

Calling `EXPIRE` again on the same key replaces the old countdown rather than adding to it. Since Redis 7 you can make that conditional: `NX` sets a timer only if there is none, `XX` only if there already is one, `GT` only if the new time is longer and `LT` only if it is shorter. `PEXPIRE` and `PTTL` do the same in milliseconds.

The trap is the `-1`. A session written with plain `SET` and no timer stays in memory forever, and if thousands of players log in every day, those forgotten keys slowly fill the server. In this lab the clock is frozen at 2026-01-01 00:00 UTC, so a TTL never counts down while you work; it always reads exactly what you set.

## Watch it happen

```yaml
tables:
  sessions_before:
    label: session keys and their TTL (seconds left)
    columns: [key, value, ttl]
    rows:
      - [session:alpha, "101", 120]
      - [session:beta, "102", 1800]
      - [session:gamma, "103", 3600]
      - [session:delta, "104", 86400]
      - [session:orphan, "105", -1]
      - [session:legacy, "106", -1]
      - [session:guest_99, "999", -1]
  sessions_after:
    label: after EXPIRE on the two forgotten player sessions
    columns: [key, value, ttl]
    rows:
      - [session:alpha, "101", 120]
      - [session:beta, "102", 1800]
      - [session:gamma, "103", 3600]
      - [session:delta, "104", 86400]
      - [session:orphan, "105", 1800]
      - [session:legacy, "106", 1800]
      - [session:guest_99, "999", -1]
steps:
  - label: Every session
    caption: "Running TTL on each session key gives this column. Most have a countdown, from two minutes to a day."
    show: [sessions_before]
  - label: Spot the -1
    caption: "TTL session:orphan and TTL session:legacy reply -1: player sessions that will never go away."
    show: [sessions_before]
    highlight:
      - { table: sessions_before, row: 5, tone: removed }
      - { table: sessions_before, row: 6, tone: removed }
    notes:
      - { title: "Guest key", text: "session:guest_99 is also -1, but it is a throwaway that should be deleted, not kept alive." }
  - label: Start the timers
    caption: "EXPIRE session:orphan 1800 replies 1, and so does EXPIRE session:legacy 1800."
    show: [sessions_after]
    highlight:
      - { table: sessions_after, cell: [5, ttl], tone: kept }
      - { table: sessions_after, cell: [6, ttl], tone: kept }
  - label: Check the result
    caption: "TTL now replies 1800 for both. In 30 minutes Redis will remove them without any job of yours."
    show: [sessions_after]
```

## Context

`GT` only ever lengthens a timer, which is handy for "keep the player logged in while they are active". `session:alpha` has 120 seconds left, so asking for 600 with `GT` succeeds, and `TTL` shows the new value:

```redis
EXPIRE session:alpha 600 GT
TTL session:alpha
```

## Task

The player sessions `session:orphan` and `session:legacy` were created without a timer. Give each of them a lifetime of 30 minutes. Leave every other session exactly as it is, including `session:guest_99`.

## Hint

- The timer is given in seconds, so convert 30 minutes first.
- There is one command per key; the value of each session should not change.

## Solution

```redis
EXPIRE session:orphan 1800
EXPIRE session:legacy 1800
```
