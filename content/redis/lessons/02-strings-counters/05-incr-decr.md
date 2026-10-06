---
id: incr-decr
title: Atomic counters
chapter: Strings & Counters
order: 2
dataset: platform
check: state
checkQuery: SNAPSHOT views:*
---

Picture two ArcadePulse web servers counting views of Pixel Orchard. Both run `GET views:game:3`, both see `95`, both add one and both `SET` the key to `96`. Two people watched the game, yet the counter moved by one. That is a race condition, and it happens whenever a read and a write are separate steps.

`INCR key` does the read, the addition and the write inside Redis as a single step, and replies with the new number. Redis runs commands one at a time, so no other client can sneak in halfway. `DECR key` subtracts one the same way. If the key doesn't exist yet, Redis treats it as `0` first, so a brand-new counter starts at `1`.

```
redis> INCR views:game:1
(integer) 121
redis> DECR views:game:1
(integer) 120
```

The stored value is still a string; Redis just reads it as a 64-bit integer for the duration of the command. That is also the trap: if the string isn't a whole number, the command refuses. `INCR revenue:day:2026-01-01` fails with `ERR value is not an integer or out of range`, because that key holds `1499.5`. The next lesson covers decimals.

## Watch it happen

```yaml
tables:
  counters_start:
    label: view counters before any change
    columns: [key, value]
    rows:
      - [views:game:3, "95"]
      - [views:game:6, "75"]
  after_first:
    label: after the first INCR views:game:3
    columns: [key, value]
    rows:
      - [views:game:3, "96"]
      - [views:game:6, "75"]
  after_second:
    label: after the second INCR views:game:3
    columns: [key, value]
    rows:
      - [views:game:3, "97"]
      - [views:game:6, "75"]
  after_decr:
    label: after DECR views:game:6
    columns: [key, value]
    rows:
      - [views:game:3, "97"]
      - [views:game:6, "74"]
steps:
  - label: Two counters
    caption: "Pixel Orchard (game 3) has 95 views and Lantern Vale (game 6) has 75."
    show: [counters_start]
  - label: First view
    caption: "INCR views:game:3 replies (integer) 96. The read, the +1 and the write happened as one step."
    show: [after_first]
    highlight: [{ table: after_first, cell: [1, value], tone: kept }]
  - label: Second view
    caption: "A second INCR replies (integer) 97. Two calls always mean two views, however many servers send them."
    show: [after_second]
    highlight: [{ table: after_second, cell: [1, value], tone: kept }]
  - label: Undo a double count
    caption: "DECR views:game:6 takes one away and replies (integer) 74."
    show: [after_decr]
    highlight: [{ table: after_decr, cell: [2, value], tone: removed }]
    notes:
      - { title: "No floor", text: "DECR happily goes below zero, so guard against that in your code if negatives make no sense." }
```

## Context

Because `INCR` replies with the new value, you never need a follow-up `GET`. Bumping the site-wide total tells you the fresh count straight away:

```redis
INCR views:total
```

## Task

Two new views of Pixel Orchard (game 3) just arrived, and one earlier view of Lantern Vale (game 6) turned out to be counted twice. Record both views for game 3 and remove the extra view from game 6. Change only those two counters; `views:total` is rebuilt by a nightly job.

## Hint

- Two views means the counter goes up twice, so one command per view is fine.
- Taking one away has its own command; you don't need a negative number.

## Solution

```redis
INCR views:game:3
INCR views:game:3
DECR views:game:6
```
