---
id: push-range
title: Queues and stacks
chapter: Lists
order: 1
dataset: platform
check: state
checkQuery: SNAPSHOT queue:*
---

A Redis **list** is an ordered sequence of strings, like a line of people. ArcadePulse uses one, `queue:emails`, as a to-do list for its mail worker: the web app adds jobs, the worker takes them. Adding to either end is fast no matter how long the list grows.

`RPUSH key value [value ...]` appends to the right end (the back), and `LPUSH` adds to the left end (the front). Both reply with the new length of the list, and both create the list if it doesn't exist. Push at one end and take from the other and you have a queue, first in first out. Push and take at the same end and you have a stack, last in first out.

`LRANGE key start stop` reads a slice by position. Positions start at `0` on the left, and negative positions count from the right, so `-1` is the last item and `0 -1` means the whole list:

```
redis> LRANGE queue:emails 0 1
1) "welcome:101"
2) "receipt:102"
```

Two details about `LRANGE`: `stop` is **inclusive** (so `0 1` returns two items, unlike a slice in most programming languages), and positions beyond the end are not errors, they are simply cut to the list's real size. `LRANGE queue:emails 0 99` returns all five jobs.

## Watch it happen

```yaml
tables:
  queue:
    label: queue:emails -- oldest job on the left (index 0)
    columns: [index, job]
    rows:
      - [0, "welcome:101"]
      - [1, "receipt:102"]
      - [2, "digest:103"]
      - [3, "invite:104"]
      - [4, "alert:105"]
  queue_lpush:
    label: queue:emails after LPUSH queue:emails urgent:106
    columns: [index, job]
    rows:
      - [0, "urgent:106"]
      - [1, "welcome:101"]
      - [2, "receipt:102"]
      - [3, "digest:103"]
      - [4, "invite:104"]
      - [5, "alert:105"]
steps:
  - label: A queue of jobs
    caption: "Five email jobs, added with RPUSH, so the oldest sits at index 0 and the newest at the right."
    show: [queue]
  - label: Read the front
    caption: "LRANGE queue:emails 0 1 returns welcome:101 and receipt:102. The stop index is included."
    show: [queue]
    highlight:
      - { table: queue, row: 1, tone: focus }
      - { table: queue, row: 2, tone: focus }
  - label: Read from the end
    caption: "LRANGE queue:emails -2 -1 counts from the right and returns invite:104 and alert:105."
    show: [queue]
    highlight:
      - { table: queue, row: 4, tone: focus }
      - { table: queue, row: 5, tone: focus }
  - label: Push to the front
    caption: "LPUSH queue:emails urgent:106 replies (integer) 6 and the new job jumps ahead of everyone, shifting each index by one."
    show: [queue_lpush]
    highlight: [{ table: queue_lpush, row: 1, tone: kept }]
    notes:
      - { title: "Queue or stack?", text: "A job pushed on the left and taken from the left is served first, like the top of a stack." }
```

## Context

`RPUSH` keeps several values in the order you type them, while `LPUSH` of the same values would store them reversed. A "recently viewed" list for player 113 shows the difference:

```redis
RPUSH recent:games:113 game:2 game:5 game:7
LRANGE recent:games:113 0 -1
```

## Task

Player 113 needs two emails: an address verification `verify:113` and then a receipt `receipt:113`. Add both jobs to the back of `queue:emails`, verification first, so they are served after the five jobs already waiting.

## Hint

- The back of this queue is its right end.
- If you add both in one command, the values keep the order you write them in.

## Solution

```redis
RPUSH queue:emails verify:113 receipt:113
```
