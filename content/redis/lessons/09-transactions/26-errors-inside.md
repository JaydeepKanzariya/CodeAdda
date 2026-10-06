---
id: errors-inside
title: When commands fail inside
chapter: Transactions
order: 2
dataset: platform
check: rows-ordered
---

If you have used SQL databases, you probably expect a failed statement to roll the whole transaction back. Redis transactions do **not** roll back, and interviewers love to ask about it. What happens depends on **when** the error is caught.

**Queue-time errors** are caught while commands are being queued: an unknown command name or the wrong number of arguments. Redis marks the transaction as broken, and `EXEC` refuses to run any of it, replying `EXECABORT Transaction discarded because of previous errors.` Here, nothing changes.

**Runtime errors** only show up when the command actually runs, such as `WRONGTYPE` (a list command on a hash) or `ERR value is not an integer or out of range`. Redis cannot know about them at queue time. `EXEC` runs **every** queued command anyway. The failing one puts its error in its own slot of the reply, and the commands before and after it still take effect.

```redis
MULTI
INCRBY wallet:101 10
INCRBY wallet:102
EXEC
```

The second `INCRBY` is missing its amount, a queue-time error, so `EXEC` aborts and wallet 101 stays at 500.

Redis skips rollback on purpose: runtime errors in a transaction are programming mistakes, like using the wrong key or type, and they should be fixed in code rather than handled by the database. So check the reply of every slot after `EXEC`; a successful `EXEC` does not mean every command succeeded.

## Context

A purchase transaction for item 7 lowers its stock, then mistakenly tries to increment the `name` field, which holds text. The bad step fails at runtime, but the stock change before it has already happened, as the final read shows:

```redis
MULTI
HINCRBY stock:item:7 stock -1
HINCRBY stock:item:7 name 1
HGET stock:item:7 stock
EXEC
```

## Task

Run one transaction with these three steps, in this order:

1. Add 10 credits to `wallet:101`.
2. Increment `leaderboard:global` by 1, as if it were a plain counter (it is actually a sorted set).
3. Add 5 credits to `wallet:102`.

Return the reply of `EXEC`, one row per step, in step order.

## Hint

- All three steps go between the command that opens the transaction and the one that runs it.
- Step 2 is a valid command with the right number of arguments, so it fails only when it runs.
- Expect three rows: a number, an error message, and another number.

## Solution

```redis
MULTI
INCRBY wallet:101 10
INCR leaderboard:global
INCRBY wallet:102 5
EXEC
```
