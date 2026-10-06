---
id: persistence-cluster
title: Persistence, replication and Cluster
chapter: Redis in Production
order: 2
dataset: platform
check: state
checkQuery: SNAPSHOT *user:101*
---

Being in memory does not mean Redis forgets everything on restart. RDB persistence writes a compact point-in-time snapshot (`dump.rdb`) every so often; restarts are fast, but you lose whatever was written since the last snapshot. AOF (append-only file) logs every write; with `appendfsync everysec`, the usual setting, a crash costs about one second of writes, at the price of a bigger file that Redis compacts in the background. Many deployments enable both: AOF for durability, RDB for backups and quick restores. Pure caches often run with neither.

Replication is about availability, not durability. A replica receives a copy of every write asynchronously, so a primary that dies can lose the last writes it acknowledged but had not yet sent. Replicas also serve reads that tolerate slight lag. Redis Sentinel watches a primary and its replicas, agrees on a failure by quorum, promotes a replica and tells clients the new address. Managed services do the same job under their own names.

Redis Cluster spreads data over several primaries. Every key maps to one of 16 384 hash slots via CRC16 of the key, modulo 16384, and each primary owns a range of slots. A command that touches several keys (`RENAME`, `SINTER`, `MULTI` across keys, Lua scripts) works only if all of them live in the same slot; otherwise you get a `CROSSSLOT` error. Hash tags fix this: if a key contains `{...}`, only the text inside the braces is hashed. `{user:101}:profile` and `{user:101}:tags` share a slot, so you can transact over them. Tag by the entity you transact on, never by something huge like `{all}`, or one node takes the whole load. One nice detail: the tag `{user:101}` hashes the same bytes as the old key name `user:101`, so the first rename below would even be legal on a real cluster; the second would not, and a live migration would copy that key across slots instead.

Messaging is the last decision. Pub/Sub is fire-and-forget: a subscriber that is offline misses the message for good, which is fine for live notifications. Streams keep history, support consumer groups and acknowledgements, and suit work that must not be lost. Lua scripts (`EVAL`, or Redis 7 functions) run several commands atomically on the server, as in the lock release from lesson 38. The lab is a single in-memory node, so persistence, replicas, Sentinel, Cluster slots, Pub/Sub and Lua cannot run here; the key renaming they motivate can.

## Context

Moving a key under a tag is a plain rename. Player 102's friend list moves under `{user:102}`, and reading it back from the new name returns the same four friends:

```redis
RENAME friends:102 {user:102}:friends
SMEMBERS {user:102}:friends
```

## Task

You are preparing user 101's data for Redis Cluster so the profile and the interest tags can be updated in one transaction. Rename the profile hash `user:101` to `{user:101}:profile` and the tag set `tags:user:101` to `{user:101}:tags`. The values must stay exactly as they are, and the old names must be gone.

## Hint

- Moving a key to a new name keeps its value and type, so no copying is needed.
- Only the part inside the braces is hashed, so both new names must share the same braces.
- There are two keys to move, one command each.

## Solution

```redis
RENAME user:101 {user:101}:profile
RENAME tags:user:101 {user:101}:tags
```
