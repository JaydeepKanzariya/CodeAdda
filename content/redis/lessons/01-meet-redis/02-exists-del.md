---
id: exists-del
title: Checking and deleting keys
chapter: Meet Redis
order: 2
dataset: platform
check: state
checkQuery: SNAPSHOT session:* cache:*
---

Before ArcadePulse sends a player to the login page, it asks one question: does their session key still exist? `EXISTS key [key ...]` answers with a number, the count of names you listed that are present. With one key that is simply `1` or `0`; with several it tells you how many survived.

`DEL key [key ...]` removes keys and replies with how many it actually removed. Asking it to delete a key that is not there is not an error; it just doesn't count. Both commands accept many keys at once, so a cleanup job can clear a whole batch in a single round trip:

```
redis> EXISTS session:alpha session:zeta
(integer) 1
redis> DEL session:zeta
(integer) 0
```

`UNLINK` takes the same arguments and gives the same reply, but frees the memory in a background thread. Reach for it when a key might be huge, such as a list with millions of items, so the server is not frozen while it cleans up.

Watch out for repeated names: `EXISTS session:alpha session:alpha` replies `2`, because every argument is counted separately. If you use the reply as "how many different keys exist", list each key only once.

## Context

The count that `DEL` returns is a cheap audit trail. Here two names are listed, but only one of them is a real session, so the reply is `1`:

```redis
EXISTS session:orphan session:ghost
DEL session:orphan session:ghost
```

## Task

Two leftovers need to go: the guest session `session:guest_99` and the stale featured-game cache `cache:featured`. Remove both in one command, and leave every other session and cache key untouched.

## Hint

- One command can take several key names, one after another.
- Deleting is safe to repeat: a second run would just report fewer removals.
- `cache:game:3` is still in use, so it must survive.

## Solution

```redis
DEL session:guest_99 cache:featured
```
