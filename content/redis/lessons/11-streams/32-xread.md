---
id: xread
title: Reading new entries
chapter: Streams
order: 2
dataset: platform
check: rows-ordered
---

A worker that tails a stream does not want the whole history every time it wakes up. It remembers the ID of the last entry it handled and asks only for what came after. `XREAD COUNT n STREAMS key id` does exactly that: it returns up to `n` entries whose IDs are strictly greater than `id`, oldest first. The worker stores the last ID it saw, and the next call picks up from there.

That "strictly greater" is the difference from `XRANGE`, whose start bound is inclusive. Feed `XRANGE` the ID you already processed and you get that entry again, which is how duplicate notifications get sent. The reply shape differs too: `XREAD` can read several streams in one call, so every row names its stream. On the seeded log, `XREAD COUNT 1 STREAMS events:matches 1700000000008-0` returns one row, `events:matches`, `1700000000009-0`, with the fields of match m10.

Two special IDs matter. `0` (or `0-0`) means "from the very beginning", and `$` means "only entries added after this call starts". Add `BLOCK ms` and the call waits up to that many milliseconds for something new instead of returning empty, which turns polling into a long-poll. The lab is a single session, so nothing could ever arrive while it waited: `BLOCK` returns at once with a notice, and it is best left out of the answers you run here.

The production pitfall is using `$` in a loop. Each call with `$` only sees what arrives during that call, so anything written between two calls is silently skipped. Use `$` once to find your starting point, then pass the last ID you actually received.

## Context

A notifier that has already handled everything up to m8 asks for at most two newer events. Only m9 and m10 come back, and the notifier would save `1700000000009-0` as its new position before its next call:

```redis
XREAD COUNT 2 STREAMS events:matches 1700000000007-0
```

## Task

A consumer last processed the entry with ID `1700000000004-0` in `events:matches`. Return the next 3 entries after it, oldest first, in the stream/ID/fields shape that names the stream on every row.

## Hint

- The ID you pass is the one already handled; this command returns only IDs greater than it.
- Limit the reply to three entries.
- `XRANGE` would repeat the entry you already processed and drops the stream column.

## Solution

```redis
XREAD COUNT 3 STREAMS events:matches 1700000000004-0
```
