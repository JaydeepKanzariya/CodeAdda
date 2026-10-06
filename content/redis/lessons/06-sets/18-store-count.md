---
id: store-count
title: Storing and counting results
chapter: Sets
order: 3
dataset: platform
check: state
checkQuery: SNAPSHOT friends:*
---

Every player profile on ArcadePulse shows a "mutual friends" panel. Working out the overlap of two friend lists on every page view wastes effort when the lists rarely change, so the backend computes the overlap once and keeps it under its own key for the next request to read.

Each set operation has a `STORE` twin that writes the result instead of returning it: `SINTERSTORE dest a b ...`, `SUNIONSTORE dest a b ...` and `SDIFFSTORE dest a b ...`. The **destination comes first**, then the source keys. The reply is the size of the new set, and `SCARD dest` will report the same number later.

When you only need the number, not the members, Redis 7 has `SINTERCARD numkeys key [key ...] [LIMIT n]`. Note the leading count of keys:

```redis
SINTERCARD 2 index:tier:plus online:users
```

That replies `2`, because players 102 and 105 are both plus-tier and online. `LIMIT` lets Redis stop counting early, which is handy for "at least 3 mutual friends" checks.

A `STORE` command **replaces** whatever the destination held, even a key of another type, without asking. If the result is empty, the destination is deleted rather than saved as an empty set. Stored results also go stale when the sources change, so production code usually gives them a short TTL or rebuilds them when a friend is added.

## Context

The lobby keeps a ready-made list of pro players who are online so the matchmaker can read it in one call. The intersection is saved under `online:pro` and then counted:

```redis
SINTERSTORE online:pro index:tier:pro online:users
SCARD online:pro
```

## Task

Save the mutual friends of user 101 and user 102 as a new set named `friends:mutual:101:102`. It must contain exactly the players who appear in both `friends:101` and `friends:102`. Leave the two source sets unchanged.

## Hint

- This is an intersection whose result is kept in Redis instead of being sent back to you.
- The key you are creating is the first argument; the two friend lists follow it.
- A correct answer replies with 3.

## Solution

```redis
SINTERSTORE friends:mutual:101:102 friends:101 friends:102
```
