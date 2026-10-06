---
id: naming-type
title: Naming keys well
chapter: Meet Redis
order: 3
dataset: platform
check: rows-unordered
---

Redis has one flat keyspace: no folders, no tables, just names. Structure comes entirely from how your team names keys. The common convention, used throughout ArcadePulse, is `object:id` or `object:id:detail`, joined with colons: `user:104` is a player, `views:game:3` is a counter for one game, `tags:user:102` holds that player's interests. Read left to right, a name goes from general to specific.

Good names pay off later. A shared prefix lets you find a family of keys with `SCAN 0 MATCH session:*`, monitoring tools group memory by prefix, and a new teammate can guess where data lives. Keep names readable but short, since every byte of every key is stored in RAM, and pick one separator and stick to it.

A name doesn't tell Redis what is inside, though. `TYPE key` does. It replies with one of `string`, `hash`, `list`, `set`, `zset` (sorted set) or `stream`:

```
redis> TYPE user:104
hash
redis> TYPE queue:emails
list
```

Two surprises: `TYPE` on a key that doesn't exist replies `none` rather than an error, and bitmaps and HyperLogLogs (later chapters) report `string`, because that is how Redis stores them underneath. Checking the type first matters, because a command for the wrong type fails with `WRONGTYPE Operation against a key holding the wrong kind of value`.

## Context

Names help a human guess, and `TYPE` confirms the guess. The `tags:` prefix suggests a collection of unique words, and Redis confirms it is a set:

```redis
TYPE tags:user:101
```

## Task

ArcadePulse keeps its all-time XP ranking under `leaderboard:global`. Before writing code against it, find out which Redis data type that key holds.

## Hint

- You only need the key's name; the reply is a single word.
- A ranking that keeps every player in score order is one of the six types listed above.

## Solution

```redis
TYPE leaderboard:global
```
