---
id: consumer-groups
title: Consumer groups
chapter: Streams
order: 3
dataset: platform
check: state
checkQuery: SNAPSHOT events:*
---

Plain `XREAD` gives every reader every entry. That suits fan-out, but when three notification workers share a backlog you want each entry handled by exactly one of them, and you want to know which entries are still being worked on. A consumer group gives you both. The group keeps one cursor, `last_delivered`, and a pending entries list (PEL) that records which consumer received which entry and has not confirmed it yet.

`XGROUP CREATE key group id` makes the group. The ID is where the cursor starts: `0` means "deliver the whole history", while `$` means "only entries added from now on". Add `MKSTREAM` when the stream may not exist yet. Workers then call `XREADGROUP GROUP group consumer COUNT n STREAMS key >`. The `>` asks for entries never delivered to anyone in this group; each one handed out moves the cursor and is added to the PEL under that consumer's name. Consumers do not need to be registered in advance: the first read creates them.

Groups are independent of each other. The seeded `scorers` group has already delivered m1 to m4 to `worker-a`, and a new `notifiers` group on the same stream still starts wherever its own ID says. This is how one event log feeds several services, each with its own progress.

The mistake teams make on day one is creating the group with `$` on a stream that already holds unprocessed events, then wondering why the backlog never gets handled. The opposite mistake is replacing `>` with `0` in the worker loop: an explicit ID re-reads that consumer's own pending entries instead of fetching new ones, which is useful for recovery after a crash and wrong for normal work.

## Watch it happen

```yaml
tables:
  groups_before:
    label: groups on events:matches -- as seeded
    columns: [group, last_delivered, pending, consumers]
    rows:
      - [scorers, "1700000000003-0", 4, "worker-a: 4"]
  groups_created:
    label: after XGROUP CREATE events:matches notifiers 0
    columns: [group, last_delivered, pending, consumers]
    rows:
      - [notifiers, "0-0", 0, "(none yet)"]
      - [scorers, "1700000000003-0", 4, "worker-a: 4"]
  delivered:
    label: XREADGROUP reply for worker-b with COUNT 2 and >
    columns: [stream, id, match, scorer, points]
    rows:
      - [events:matches, "1700000000000-0", m1, "101", "3"]
      - [events:matches, "1700000000001-0", m2, "103", "2"]
  groups_after:
    label: groups after the read
    columns: [group, last_delivered, pending, consumers]
    rows:
      - [notifiers, "1700000000001-0", 2, "worker-b: 2"]
      - [scorers, "1700000000003-0", 4, "worker-a: 4"]
steps:
  - label: One group already exists
    caption: "The scorers group has handed m1 to m4 to worker-a, and all four are still pending."
    show: [groups_before]
    highlight: [{ table: groups_before, row: 1, tone: focus }]
  - label: Create a second group at 0
    caption: "XGROUP CREATE events:matches notifiers 0 adds a group whose cursor sits before the first entry, so the whole history is still to be delivered."
    show: [groups_created]
    highlight: [{ table: groups_created, row: 1, tone: kept }]
    notes:
      - { title: "0 versus $", text: "With $ the cursor would start after m10 and the ten existing events would never reach this group.", tone: info }
  - label: worker-b takes two entries
    caption: "XREADGROUP GROUP notifiers worker-b COUNT 2 STREAMS events:matches > hands out the two oldest entries this group has never delivered."
    show: [delivered]
    highlight: [{ table: delivered, row: 1, tone: focus }, { table: delivered, row: 2, tone: focus }]
  - label: Cursor and pending list move
    caption: "The notifiers cursor is now 1700000000001-0 and both entries sit in its pending list under worker-b. The scorers group is untouched."
    show: [groups_after]
    highlight: [{ table: groups_after, row: 1, tone: kept }]
```

## Context

A group can be created before its stream exists. Here an audit group on a fresh login stream starts at `$`, so it sees only events added after it was created, and its first worker receives exactly the one login that followed:

```redis
XGROUP CREATE events:logins auditors $ MKSTREAM
XADD events:logins * user 102 device web
XREADGROUP GROUP auditors audit-1 COUNT 1 STREAMS events:logins >
```

## Task

The notification service needs its own progress through `events:matches`. Create a consumer group named `notifiers` that starts from the beginning of the stream, then have the consumer `worker-b` take the first 2 undelivered entries. Leave the `scorers` group as it is.

## Hint

- The group's starting ID decides whether existing entries are delivered at all.
- Read through the group, naming both the group and the consumer, and cap the read at two.
- The special ID for "never delivered to this group" is not a number.

## Solution

```redis
XGROUP CREATE events:matches notifiers 0
XREADGROUP GROUP notifiers worker-b COUNT 2 STREAMS events:matches >
```
