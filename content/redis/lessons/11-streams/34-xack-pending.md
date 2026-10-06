---
id: xack-pending
title: Acknowledging work
chapter: Streams
order: 4
dataset: platform
check: state
checkQuery: SNAPSHOT events:*
---

Delivering an entry is only half of the contract. Until a worker says "done", the entry stays in the group's pending entries list, and that list is your safety net: if the worker crashes halfway through, the entry is not lost, it is still pending under that worker's name. `XACK key group id [id ...]` is the "done". It removes those IDs from the PEL and returns how many it actually removed.

`XPENDING key group` is the dashboard. Its summary form returns the number of pending entries, the smallest and largest pending IDs, and a count per consumer. On the seeded data, `XPENDING events:matches scorers` reports `4`, `1700000000000-0`, `1700000000003-0` and `worker-a: 4`: m1 to m4 were handed out and none were confirmed. Run it after acking to prove the work is really off the list.

Watch the return value of `XACK`. Acking an ID that is not pending in that group, or naming the wrong group, is not an error; it quietly returns `0` and the real entry stays pending forever. The usual cause is acking a different ID than the one just processed, or acking in the `notifiers` group code path for work that came from `scorers`. A dashboard showing a pending count that only ever grows is the symptom.

When a worker dies for good, its pending entries need a new owner. Real Redis offers `XAUTOCLAIM key group consumer min-idle-time start`, which hands entries idle longer than the threshold to another consumer (`XCLAIM` does the same for specific IDs), and the delivery counter it tracks lets you park poison messages that keep failing. The lab does not implement those two commands, so here you recover by acking from the original consumer's list.

## Context

Pending entries do not have to be acknowledged in order. Confirming only m4 leaves three entries pending, and the summary shows the newest pending ID drop to m3:

```redis
XACK events:matches scorers 1700000000003-0
XPENDING events:matches scorers
```

## Task

In the `scorers` group on `events:matches`, `worker-a` has finished the two oldest entries still pending for it. Acknowledge exactly those two and nothing else, so the other two stay pending.

## Hint

- Ask the group which IDs are pending before you acknowledge anything.
- Use full stream IDs, including the `-0` sequence part.
- One acknowledgement call can take several IDs, and its reply should be the number you expected.

## Solution

```redis
XACK events:matches scorers 1700000000000-0 1700000000001-0
```
