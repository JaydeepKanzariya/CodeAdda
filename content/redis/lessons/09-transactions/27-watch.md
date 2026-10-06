---
id: watch
title: Optimistic locking
chapter: Transactions
order: 3
dataset: platform
check: rows-unordered
---

The ArcadePulse shop must never let a wallet go below zero. The check is easy to write: read the balance, and if it covers the price, deduct it. The danger is the gap between the read and the write. If a second purchase from the same player lands in that gap, both checks pass against the old balance and the wallet is overspent. `MULTI` alone cannot help, because inside it you cannot read a value and branch.

`WATCH key [key ...]` closes the gap without taking a lock. You watch the keys you are about to read, read them, then open `MULTI`, queue the writes and call `EXEC`. If **any** watched key was modified between `WATCH` and `EXEC`, Redis refuses to run the queue and `EXEC` replies **nil** (this lab shows `EXEC` with an empty result). Your code then simply starts over: watch, read, decide, try again. This is **optimistic locking**: you assume no conflict and pay only when one happens.

```redis
WATCH wallet:101
GET wallet:101
MULTI
DECRBY wallet:101 30
EXEC
```

Nothing touched wallet 101 after the `WATCH`, so `EXEC` runs and replies with one row, `1` → `470`.

The watch list is cleared after every `EXEC` or `DISCARD`, whether it ran or not, and `UNWATCH` clears it by hand. The trap people miss: **any** write to a watched key aborts the transaction, including a write made by your own connection before `MULTI`. Real Redis also aborts if a watched key expires in the meantime.

## Watch it happen

```yaml
tables:
  timeline:
    label: one connection, step by step
    columns: [step, command, reply, wallet_102]
    rows:
      - [1, "WATCH wallet:102", "OK", "120"]
      - [2, "INCRBY wallet:102 30", "150", "150"]
      - [3, "MULTI", "OK", "150"]
      - [4, "DECRBY wallet:102 40", "QUEUED", "150"]
      - [5, "EXEC", "(nil)", "150"]
steps:
  - label: Start watching
    caption: "The checkout watches Mateo's wallet while it holds 120 credits."
    show: [timeline]
    highlight: [{ table: timeline, row: 1, tone: focus }]
  - label: A write lands in the gap
    caption: "A refund of 30 changes wallet:102 to 150 before the transaction starts. Redis notes that the watched key changed."
    show: [timeline]
    highlight: [{ table: timeline, row: 2, tone: removed }]
    notes:
      - { title: "Who wrote it does not matter", text: "Another client or this same connection, any change to a watched key counts." }
  - label: Queue the purchase
    caption: "The purchase of 40 is queued as usual. Nothing warns you yet."
    show: [timeline]
    highlight: [{ table: timeline, row: 4, tone: focus }]
  - label: EXEC refuses
    caption: "EXEC replies nil and the queued DECRBY never runs. The wallet stays at 150, and the shop retries with the fresh balance."
    show: [timeline]
    highlight: [{ table: timeline, row: 5, tone: kept }]
```

## Context

When nothing interferes, the watched transaction goes through. Here the shop watches Amina's wallet, reads it, and then moves 25 credits to Mateo:

```redis
WATCH wallet:101
GET wallet:101
MULTI
DECRBY wallet:101 25
INCRBY wallet:102 25
EXEC
```

## Task

Act out a conflict on Mateo's wallet, `wallet:102`, from a single connection:

1. Start watching `wallet:102`.
2. Before opening the transaction, a refund arrives: add 30 credits to `wallet:102`.
3. Open a transaction, queue a purchase that takes 40 credits from `wallet:102`, and run it.

Return the reply of the final command.

## Hint

- The watch has to come before the refund, or nothing will notice the change.
- Make the refund an ordinary write outside the transaction.
- The reply you are after is an empty (nil) `EXEC`, not a list of results.

## Solution

```redis
WATCH wallet:102
INCRBY wallet:102 30
MULTI
DECRBY wallet:102 40
EXEC
```
