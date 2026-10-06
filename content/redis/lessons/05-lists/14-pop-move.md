---
id: pop-move
title: Taking items off
chapter: Lists
order: 2
dataset: platform
check: state
checkQuery: SNAPSHOT queue:*
---

The mail worker takes jobs off `queue:emails` with `LPOP key` (from the left, where the oldest job sits) or `RPOP key` (from the right). Each removes the item and returns it. Since Redis 6.2 both take an optional count, so `LPOP key 3` hands a worker a batch of three at once, oldest first.

Popping has a weakness, though: once a job is popped it exists only in the worker's memory. If the worker crashes while sending, the email is lost. The reliable-queue pattern fixes that with `LMOVE source destination LEFT|RIGHT LEFT|RIGHT`, which removes an item from one list and pushes it onto another in a single atomic step. The first direction says which end to take from, the second which end to put it on. The job is never "nowhere": it is either still waiting or sitting in a processing list, where a recovery job can find it if the worker dies.

```
redis> LPOP feed:101 2
1) "levelup:7"
2) "badge:speedrun"
```

When a pop takes the last item, the list key disappears, so `queue:emails:processing` doesn't exist until something is moved into it; `LMOVE` creates it. Popping an empty or missing list replies `(nil)`. You will see the older `RPOPLPUSH source destination` in existing code; it is exactly `LMOVE source destination RIGHT LEFT`, which for a queue filled from the right takes the newest job, not the oldest. This lab also accepts the blocking forms (`BLPOP`, `BLMOVE`), but returns immediately instead of waiting.

## Context

The source and destination can be the same list. Moving from the left end to the right end rotates the list, which is a simple way to cycle through items round-robin. Player 101's oldest feed event goes to the back:

```redis
LMOVE feed:101 feed:101 LEFT RIGHT
```

## Task

The worker is ready for its next job. Move the oldest waiting job from `queue:emails` into `queue:emails:processing` in one atomic step, so it is never missing from both lists. The other four jobs stay in the queue in their current order.

## Hint

- Jobs were added on the right, so the oldest one is at the left end.
- One command takes from one list and pushes onto another; you choose both ends.

## Solution

```redis
LMOVE queue:emails queue:emails:processing LEFT RIGHT
```
