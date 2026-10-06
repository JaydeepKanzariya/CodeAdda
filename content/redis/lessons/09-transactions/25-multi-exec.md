---
id: multi-exec
title: All or nothing
chapter: Transactions
order: 1
dataset: platform
check: state
checkQuery: SNAPSHOT wallet:*
---

ArcadePulse players can gift credits to each other. A gift is two writes: take credits from the sender's wallet and add them to the receiver's. If the server runs the first and then something else sneaks in, or the client disconnects between the two, credits vanish or another client reads a half-finished state. The two writes need to happen **together**.

`MULTI` opens a transaction. Every command you send after it is not run yet; Redis replies `QUEUED` and stores it. `EXEC` then runs the whole queue in one go, and no other client's command can run in the middle. `DISCARD` throws the queue away instead. The reply to `EXEC` is a list with one reply per queued command, which this lab shows as `index, reply` rows.

```redis
MULTI
INCRBY wallet:102 10
GET wallet:102
EXEC
```

The `EXEC` reply has two rows: `1` → `130` and `2` → `"130"`. While the transaction was being queued, the `GET` only said `QUEUED`, because nothing had run yet.

That last point is the pitfall: inside `MULTI` you cannot read a value and decide what to do next, since every reply is `QUEUED` until `EXEC`. "Only transfer if the balance is high enough" needs `WATCH` (two lessons ahead) or a server-side script. Also make sure every `MULTI` ends with `EXEC` or `DISCARD`; in this lab a script that stops halfway through a transaction has it discarded, with a notice.

## Watch it happen

```yaml
tables:
  before:
    label: wallets before the gift
    columns: [key, value]
    rows:
      - ["wallet:101", "500"]
      - ["wallet:102", "120"]
  queue:
    label: replies while queueing
    columns: [command, result]
    rows:
      - ["MULTI", "OK"]
      - ["DECRBY wallet:101 50", "QUEUED"]
      - ["INCRBY wallet:102 50", "QUEUED"]
  exec:
    label: EXEC reply
    columns: [index, reply]
    rows:
      - [1, 450]
      - [2, 170]
  after:
    label: wallets after EXEC
    columns: [key, value]
    rows:
      - ["wallet:101", "450"]
      - ["wallet:102", "170"]
steps:
  - label: Two balances
    caption: "Amina (101) has 500 credits and Mateo (102) has 120."
    show: [before]
  - label: Queue the transfer
    caption: "After MULTI, each write is stored and answered with QUEUED. Neither wallet has changed yet."
    show: [before, queue]
    highlight: [{ table: queue, row: 2, tone: focus }, { table: queue, row: 3, tone: focus }]
    notes:
      - { title: "Nothing has run", text: "Other clients still see 500 and 120 at this point." }
  - label: EXEC runs both
    caption: "EXEC runs the queue back to back and returns one reply per command, in order."
    show: [queue, exec]
    highlight: [{ table: exec, row: 1, tone: kept }, { table: exec, row: 2, tone: kept }]
  - label: Credits conserved
    caption: "101 now has 450 and 102 has 170. The total is still 620, and no client ever saw only half of the transfer."
    show: [after]
```

## Context

Each game page view bumps two counters, the game's own and the site-wide total. A dashboard must never see one updated without the other, so both increments go in one transaction:

```redis
MULTI
INCRBY views:game:7 1
INCRBY views:total 1
EXEC
```

## Task

Amina (wallet `wallet:101`) is gifting **50 credits** to Mateo (wallet `wallet:102`). Take 50 from her wallet and add 50 to his, inside a single transaction so both changes happen together.

## Hint

- Open the transaction first, queue the two wallet changes, then run the queue.
- One wallet goes down by 50 and the other goes up by 50.
- Afterwards the wallets should read 450 and 170.

## Solution

```redis
MULTI
DECRBY wallet:101 50
INCRBY wallet:102 50
EXEC
```
