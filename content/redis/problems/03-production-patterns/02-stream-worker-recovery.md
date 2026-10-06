---
id: stream-worker-recovery
title: Stream Worker Recovery
chapter: Production Patterns
order: 10
difficulty: Hard
check: state
checkQuery: SNAPSHOT events:*
---

Finished matches are appended to the stream `events:matches`. The consumer group `scorers` turns each one into league points, and an entry stays in the group's pending list until a worker acknowledges it. Acknowledging work that was never finished would silently lose a match's points, so a worker only acknowledges what it has really completed.

Last night worker `scorer-a` crashed. It had read two entries, `1-0` and `1-1`. The points database shows that `1-0` was saved before the crash and `1-1` was not. A replacement worker, `scorer-b`, is now coming online.

## Tables

| Key | Type | Sample value from the Setup |
|---|---|---|
| `events:matches` | stream, group `scorers` | `1-0` → `{ match: 501, home: 3, away: 1 }` |

State of the group before you start: entry `0-5` was delivered and acknowledged long ago, `1-0` and `1-1` are pending for `scorer-a`, and `1-2`, `1-3`, `1-4` have never been delivered.

## Task

Acting as consumer `scorer-b` in group `scorers`:

1. Take the next **two** entries that no consumer in the group has received yet.
2. Of those two, scoring succeeded for `1-2` but failed for `1-3` (the points service timed out).
3. Acknowledge exactly the work that is finished: the entry `scorer-a` completed before crashing and the one `scorer-b` just completed.

Afterwards the group must have delivered up to `1-3`, and only the unfinished entries, `1-1` and `1-3`, may still be pending. `1-4` must not have been delivered yet.

## Example

**Input**

```text
events:matches
  0-5  { match: 500, home: 2, away: 2 }   delivered, acknowledged
  1-0  { match: 501, home: 3, away: 1 }   pending (scorer-a), finished
  1-1  { match: 502, home: 0, away: 2 }   pending (scorer-a), not finished
  1-2  { match: 503, home: 4, away: 4 }   not delivered
  1-3  { match: 504, home: 1, away: 0 }   not delivered
  1-4  { match: 505, home: 2, away: 1 }   not delivered
group scorers: last_delivered 1-1, pending [1-0, 1-1]
```

**Output** (`events:matches` afterwards; the entries themselves are unchanged)

```text
key             type    ttl  value
events:matches  stream  -1   entries 0-5, 1-0, 1-1, 1-2, 1-3, 1-4 (unchanged)
                             groups: { scorers: { last_delivered: "1-3", pending: ["1-1", "1-3"] } }
```

**Explanation:** Reading new entries for the group hands `scorer-b` `1-2` and `1-3` and moves the group's position to `1-3`. Acknowledging `1-0` and `1-2` clears the two finished matches. `1-1` and `1-3` stay pending so another worker can retry them later. Acknowledging everything that was delivered would empty the pending list and lose two matches' points. Reading without the group, or reading all three new entries, leaves the group in a different position.

## Hint

- Only a group read moves an entry into the pending list; a plain stream read does not.
- The special ID that means "entries never delivered to this group" is not a number.
- Acknowledge after reading: an entry that was never delivered to the group cannot be acknowledged.

## Setup

```redis
XADD events:matches 0-5 match 500 home 2 away 2
XADD events:matches 1-0 match 501 home 3 away 1
XADD events:matches 1-1 match 502 home 0 away 2
XADD events:matches 1-2 match 503 home 4 away 4
XADD events:matches 1-3 match 504 home 1 away 0
XADD events:matches 1-4 match 505 home 2 away 1
XGROUP CREATE events:matches scorers 0
XREADGROUP GROUP scorers scorer-a COUNT 1 STREAMS events:matches >
XACK events:matches scorers 0-5
XREADGROUP GROUP scorers scorer-a COUNT 2 STREAMS events:matches >
```

## Solution

```redis
XREADGROUP GROUP scorers scorer-b COUNT 2 STREAMS events:matches >
XACK events:matches scorers 1-0 1-2
```
