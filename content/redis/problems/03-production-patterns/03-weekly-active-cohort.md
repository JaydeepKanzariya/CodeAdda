---
id: weekly-active-cohort
title: Weekly Active Cohort
chapter: Production Patterns
order: 11
difficulty: Hard
check: state
checkQuery: SNAPSHOT active:* cohort:*
---

The growth team rewards players who logged in on every single day of the holiday week, Friday 2025-12-26 to Thursday 2026-01-01. Daily activity is tracked as one bitmap per day: bit *N* of `active:<date>` is 1 when player *N* opened the game that day. With millions of players, the cohort has to be computed inside Redis, bit by bit, and kept for a week so the rewards job can read it.

## Tables

| Key | Type | Sample value from the Setup |
|---|---|---|
| `active:2025-12-25` | bitmap (day before the week) | bits 104, 105 set |
| `active:2025-12-26` … `active:2025-12-31` | bitmap, one per day | `active:2025-12-29`: bits 101, 103, 104, 105 set |
| `active:2026-01-01` | bitmap | bits 101, 102, 103, 104 set |

## Task

Build the bitmap `cohort:week:2025-12-26` in which bit *N* is 1 **only if** player *N* was active on **all seven** days from `2025-12-26` to `2026-01-01`, inclusive.

- Give `cohort:week:2025-12-26` a TTL of **604800** seconds (7 days).
- Finish by counting the players in the cohort.
- The eight daily `active:*` bitmaps must not change.

## Example

**Input**

```text
active:2025-12-25 = { 104, 105 }
active:2025-12-26 = { 101, 102, 103, 104, 105 }
active:2025-12-27 = { 101, 102, 103, 104, 105 }
active:2025-12-28 = { 101, 102, 103, 104, 105 }
active:2025-12-29 = { 101, 103, 104, 105 }
active:2025-12-30 = { 101, 102, 103, 104, 105 }
active:2025-12-31 = { 101, 102, 103, 104, 105 }
active:2026-01-01 = { 101, 102, 103, 104 }
```

**Output** (the new key; the eight `active:*` bitmaps are unchanged)

```text
key                     type    ttl     value (hex)
cohort:week:2025-12-26  string  604800  0000000000000000000000000580
```

The final count reply is `3`.

**Explanation:** Players 101, 103 and 104 have a 1 in all seven daily bitmaps, which are bits 101, 103 and 104 of the result (bytes `05` and `80` at the end of the hex). Player 102 skipped 2025-12-29 and player 105 skipped New Year's Day, so both drop out. Combining with OR would reward anyone active on any day, and including `active:2025-12-25` would wrongly remove player 101, who did not play the day before the week started.

## Hint

- A bitwise operation across several bitmaps can write its result to a new key in one step.
- "Active on every day" is the bitwise operation that keeps a bit only when all inputs have it.
- The result is an ordinary key, so its lifetime is set the usual way, and counting set bits has its own command.

## Setup

```redis
SETBIT active:2025-12-25 104 1
SETBIT active:2025-12-25 105 1
SETBIT active:2025-12-26 101 1
SETBIT active:2025-12-26 102 1
SETBIT active:2025-12-26 103 1
SETBIT active:2025-12-26 104 1
SETBIT active:2025-12-26 105 1
SETBIT active:2025-12-27 101 1
SETBIT active:2025-12-27 102 1
SETBIT active:2025-12-27 103 1
SETBIT active:2025-12-27 104 1
SETBIT active:2025-12-27 105 1
SETBIT active:2025-12-28 101 1
SETBIT active:2025-12-28 102 1
SETBIT active:2025-12-28 103 1
SETBIT active:2025-12-28 104 1
SETBIT active:2025-12-28 105 1
SETBIT active:2025-12-29 101 1
SETBIT active:2025-12-29 103 1
SETBIT active:2025-12-29 104 1
SETBIT active:2025-12-29 105 1
SETBIT active:2025-12-30 101 1
SETBIT active:2025-12-30 102 1
SETBIT active:2025-12-30 103 1
SETBIT active:2025-12-30 104 1
SETBIT active:2025-12-30 105 1
SETBIT active:2025-12-31 101 1
SETBIT active:2025-12-31 102 1
SETBIT active:2025-12-31 103 1
SETBIT active:2025-12-31 104 1
SETBIT active:2025-12-31 105 1
SETBIT active:2026-01-01 101 1
SETBIT active:2026-01-01 102 1
SETBIT active:2026-01-01 103 1
SETBIT active:2026-01-01 104 1
```

## Solution

```redis
BITOP AND cohort:week:2025-12-26 active:2025-12-26 active:2025-12-27 active:2025-12-28 active:2025-12-29 active:2025-12-30 active:2025-12-31 active:2026-01-01
EXPIRE cohort:week:2025-12-26 604800
BITCOUNT cohort:week:2025-12-26
```
