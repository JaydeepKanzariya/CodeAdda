---
id: xadd-xrange
title: An append-only log
chapter: Streams
order: 1
dataset: platform
check: state
checkQuery: SNAPSHOT events:*
---

A list can work as a queue, but once an item is popped it is gone: nobody else can read it, and nothing records that it ever happened. A stream keeps every entry. You append to the end, each entry gets an ID that only ever grows, and any number of readers can walk the log at their own pace. ArcadePulse writes every finished match to `events:matches` so scoring, notifications and analytics can each read the same history.

`XADD key * field value [field value ...]` appends one entry. The `*` asks Redis to choose the ID, which has the shape `<milliseconds>-<sequence>`; the sequence only matters when two entries land in the same millisecond. Each entry is a small set of field/value pairs, like a flat hash. `XRANGE key start end [COUNT n]` reads entries in ID order, where `-` means the smallest possible ID and `+` the largest, and `XLEN key` counts them. On the seeded data, `XRANGE events:matches - + COUNT 1` returns a single row: ID `1700000000000-0` with fields `match m1, scorer 101, points 3`.

The lab runs on a frozen clock, so an auto ID here always starts with `1767225600000` (2026-01-01 00:00 UTC) and the sequence counts up from `0`. In real Redis the first part is the server's wall-clock time when the entry arrives.

The mistake people make in production is inventing their own IDs. An explicit ID must be greater than the newest one already in the stream, or `XADD` refuses it, and when two producers each pick "the next number" they collide. Let the server assign IDs with `*` unless you are replaying data that already has IDs. The other trap is forgetting that a stream grows forever: real services cap it with `XADD key MAXLEN ~ 100000 * ...` or a periodic `XTRIM`.

## Watch it happen

```yaml
tables:
  stream_tail:
    label: events:matches -- the newest three of its 10 entries
    columns: [id, match, scorer, points]
    rows:
      - ["1700000000007-0", m8, "103", "3"]
      - ["1700000000008-0", m9, "106", "2"]
      - ["1700000000009-0", m10, "102", "4"]
  stream_after:
    label: events:matches -- after XADD with an auto ID
    columns: [id, match, scorer, points]
    rows:
      - ["1700000000007-0", m8, "103", "3"]
      - ["1700000000008-0", m9, "106", "2"]
      - ["1700000000009-0", m10, "102", "4"]
      - ["1767225600000-0", m11, "104", "3"]
steps:
  - label: The log as seeded
    caption: "The stream holds 10 match events. The last one, m10, has ID 1700000000009-0, so any new entry needs a larger ID."
    show: [stream_tail]
    highlight: [{ table: stream_tail, row: 3, tone: focus }]
  - label: Append with *
    caption: "XADD events:matches * match m11 scorer 104 points 3 asks Redis to pick the ID. On the lab's frozen clock that is 1767225600000-0, which XADD returns."
    show: [stream_after]
    highlight: [{ table: stream_after, row: 4, tone: kept }]
    notes:
      - { title: "Nothing moves", text: "Existing entries keep their IDs and positions. A stream is only ever appended to.", tone: info }
  - label: Read it back
    caption: "XRANGE events:matches - + COUNT 11 now ends with m11, and XLEN events:matches returns 11."
    show: [stream_after]
    highlight: [{ table: stream_after, row: 4, tone: focus }]
```

## Context

Streams are created by the first `XADD`, just like lists. A login audit log that does not exist yet comes into being with its first event, and reading the whole thing back with `-` and `+` returns both entries with server-assigned IDs:

```redis
XADD events:logins * user 101 device web
XADD events:logins * user 103 device ios
XRANGE events:logins - +
```

## Task

Match m11 has just finished: player 104 scored 3 points. Append it to `events:matches` with a server-assigned ID and the fields `match` = `m11`, `scorer` = `104` and `points` = `3`, in that order.

## Hint

- Let Redis choose the entry ID instead of typing a number.
- The fields go after the ID as name/value pairs, like a hash.
- `XRANGE` with `-` and `+` shows whether your entry landed at the end.

## Solution

```redis
XADD events:matches * match m11 scorer 104 points 3
```
