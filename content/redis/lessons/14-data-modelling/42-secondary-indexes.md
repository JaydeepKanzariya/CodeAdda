---
id: secondary-indexes
title: Secondary indexes
chapter: Data Modelling
order: 2
dataset: platform
check: rows-unordered
---

Redis looks things up by key and nothing else. There is no `WHERE tier = 'pro'`: to find pro players you would have to scan every `user:*` hash and read its `tier` field, which is fine for twelve users and hopeless for twelve million. The fix is to maintain your own index. For every value of an attribute you care about, keep a set of the IDs that have it. ArcadePulse does this with `index:tier:pro`, `index:tier:plus` and `index:country:IN`.

Queries then become set algebra, run inside Redis. `SMEMBERS index:tier:pro` returns `101, 103, 106, 109`. An AND across attributes is `SINTER`, an OR is `SUNION`, and "pro but not in India" is `SDIFF index:tier:pro index:country:IN`. You do not need to order the inputs: `SINTER` sorts them by size itself, walks the smallest and checks each member against the rest, so a narrow index keeps the query cheap. For ranges such as "XP between 500 and 900", use a sorted set scored by the attribute instead of a set.

The price is that the index is now data you must keep correct on every write. If user 111 upgrades from plus to pro, the profile update and the index move have to happen together:

```
MULTI
HSET user:111 tier pro
SMOVE index:tier:plus index:tier:pro 111
EXEC
```

Forget the index half in one code path, an admin script or a backfill, and queries return the wrong people with no error at all. That drift is the real cost of hand-built indexes, which is why large deployments either centralise every write behind one function or move to the Redis Query Engine (`FT.CREATE`, part of Redis Stack and Redis 8), which maintains indexes over hashes automatically. The lab sticks to plain sets.

## Context

Indexes combine with any other set you keep. Intersecting the plus-tier index with the set of users online right now answers "which plus players could join a lobby?", and returns two IDs:

```redis
SINTER index:tier:plus online:users
```

## Task

Marketing wants to contact pro-tier players in India. Using the existing index sets, return the IDs of players who are both in the pro tier and in India. Any order is fine.

## Hint

- Both attributes already have an index set; you do not need to read any `user:*` hash.
- "Both" is an intersection, not a union.
- The answer comes straight from the two sets in one command.

## Solution

```redis
SINTER index:tier:pro index:country:IN
```
