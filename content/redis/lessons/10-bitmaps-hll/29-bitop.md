---
id: bitop
title: Combining days
chapter: Bitmaps & HyperLogLog
order: 2
dataset: platform
check: state
checkQuery: SNAPSHOT active:week:*
---

Daily bitmaps answer "who played today?". The ArcadePulse retention dashboard asks harder questions: who played on **every** day this week (the most loyal players), who played on **any** day (weekly actives), who came back on day two. Because each day uses the same bit for the same user, these questions become bitwise maths across whole bitmaps, done in one command on the server.

`BITOP operation destkey srckey [srckey ...]` combines the sources bit by bit and **stores** the result in `destkey`:

- `AND`: a bit is 1 only if it is 1 in every source ("active every day").
- `OR`: 1 if it is 1 in any source ("active at least once").
- `XOR`: 1 if an odd number of sources have it.
- `NOT`: flips every bit of a single source.

```redis
BITOP AND active:days:1-2 active:2026-01-01 active:2026-01-02
```

The reply is `14`, and that number trips people up: it is **not** a count of users. It is the length of the stored result in bytes (bit 106 lives in byte 13, so the string is 14 bytes long). To count the users, run `BITCOUNT` on the destination afterwards.

Like the set `STORE` commands, `BITOP` overwrites the destination. It also works through every byte of every source, so on very large bitmaps it is worth scheduling these jobs off-peak or on a replica.

## Context

Marketing wants the weekend audience. January 3rd and 4th, 2026 were a Saturday and a Sunday, so anyone active on either day counts. An `OR` builds that bitmap, and `BITCOUNT` sizes it:

```redis
BITOP OR active:weekend active:2026-01-03 active:2026-01-04
BITCOUNT active:weekend
```

## Task

Find the players who were active on **all seven days** from `active:2026-01-01` to `active:2026-01-07`, and store the result as a new bitmap named `active:week:everyday`. Do not change any of the daily bitmaps.

## Hint

- "Every day" means a user's bit must be 1 in all seven sources at once.
- The destination key comes right after the operation name, before the seven daily keys.
- A `BITCOUNT` of your new key should give 3: players 101, 103 and 106.

## Solution

```redis
BITOP AND active:week:everyday active:2026-01-01 active:2026-01-02 active:2026-01-03 active:2026-01-04 active:2026-01-05 active:2026-01-06 active:2026-01-07
```
