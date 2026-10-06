---
id: scan
title: Why not KEYS
chapter: Finding Keys Safely
order: 1
dataset: platform
check: rows-unordered
---

Sooner or later someone on the ArcadePulse team needs to find every key that matches a pattern, for example all the `game:*` hashes. `KEYS game:*` looks perfect, and on a laptop it is. In production it is dangerous: Redis runs commands one at a time, and `KEYS` walks the **entire keyspace** in a single step. On a server holding millions of keys, every other client (logins, leaderboards, carts) waits until it finishes.

`SCAN` does the same walk in small steps. `SCAN cursor [MATCH pattern] [COUNT n] [TYPE type]` returns one page of keys plus a **next cursor**. You start with cursor `0`, pass each reply's cursor into the next call, and stop when the cursor comes back as `0`. In this lab the page appears as `key` rows and the cursor appears in the notice "Next cursor: N".

```redis
SCAN 0 MATCH views:* COUNT 100
```

That returns all nine `views:*` counters with "Next cursor: 0", so one call was enough.

Three rules matter in real Redis. `COUNT` is a hint about how much work to do per call, not a promise about page size. `MATCH` is applied **after** the keys are fetched, so a page can be small or even empty while the cursor is not yet 0. And a key may show up twice during a full scan, so de-duplicate on your side. Only a returned cursor of `0` means you are done; an empty page does not. This lab filters before it pages, so its pages come out tidy, and its cursor is a simple position rather than Redis's opaque number.

## Watch it happen

```yaml
tables:
  page1:
    label: SCAN 0 MATCH game:* COUNT 3
    columns: [key]
    rows:
      - ["game:1"]
      - ["game:2"]
      - ["game:3"]
  page2:
    label: SCAN 3 MATCH game:* COUNT 3
    columns: [key]
    rows:
      - ["game:4"]
      - ["game:5"]
      - ["game:6"]
  page3:
    label: SCAN 6 MATCH game:* COUNT 3
    columns: [key]
    rows:
      - ["game:7"]
      - ["game:8"]
steps:
  - label: Start at cursor 0
    caption: "The first call returns three game keys and the notice Next cursor: 3."
    show: [page1]
    notes:
      - { title: "Not finished yet", text: "A cursor other than 0 means there is more to read." }
  - label: Pass the cursor back
    caption: "Calling SCAN 3 continues where the last page stopped and returns Next cursor: 6."
    show: [page1, page2]
    highlight: [{ table: page2, row: 1, tone: focus }]
  - label: Cursor 0 means done
    caption: "The third page holds the last two keys and returns Next cursor: 0, so all eight game keys have been seen."
    show: [page1, page2, page3]
    highlight: [{ table: page3, row: 2, tone: kept }]
    notes:
      - { title: "Server stays responsive", text: "Between calls, other clients' commands run. KEYS would have held them all until the end." }
```

## Context

A clean-up job wants to list every player's tag set without blocking the server. A single scan with a generous `COUNT` covers this small database:

```redis
SCAN 0 MATCH tags:user:* COUNT 100
```

## Task

Find every key whose name starts with `game:` using `SCAN`, not `KEYS`. Do it in **one call** that starts at cursor 0, and ask for a page large enough that the next cursor comes back as `0`. Return the matching keys, in any order.

## Hint

- Start the cursor at 0 and filter with a glob pattern that ends in a star.
- The database holds 70 keys, so a `COUNT` at least that large covers everything in one call.
- If the notice says anything other than "Next cursor: 0", your page was too small.

## Solution

```redis
SCAN 0 MATCH game:* COUNT 100
```
