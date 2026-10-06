---
id: hincrby-hdel
title: Changing fields
chapter: Hashes
order: 3
dataset: platform
check: state
checkQuery: SNAPSHOT user:105
---

When a player finishes a quest, ArcadePulse adds XP to their profile. Reading the `xp` field, adding in application code and writing it back has the same race you saw with string counters. `HINCRBY key field n` does the addition inside Redis, atomically, and replies with the new value. A negative `n` subtracts, and a missing field starts at `0`. For decimal fields use `HINCRBYFLOAT key field amount`.

To remove fields, use `HDEL key field [field ...]`. It replies with how many fields it actually removed, ignoring names that weren't there. To test for a field without reading its value, `HEXISTS key field` replies `1` or `0`.

```
redis> HINCRBY user:107 xp 35
(integer) 350
redis> HEXISTS user:112 country
(integer) 0
```

Two things catch people out. `HINCRBY` only works on whole numbers, so `HINCRBY game:3 rating 1` fails with `ERR hash value is not an integer`, because the rating is `4.2`. And removing the **last** field of a hash removes the key itself: Redis never keeps empty collections, so afterwards `EXISTS` says `0` and `TYPE` says `none`.

## Context

Ratings have a decimal part, so the float version is the one to use. Pixel Orchard's rating goes up by a tenth and the reply is the new value:

```redis
HINCRBYFLOAT game:3 rating 0.1
```

## Task

Player 105 just earned 150 XP, and the team decided to stop storing join dates on profiles. In `user:105`, raise `xp` by 150 and remove the `joined_on` field. Every other field must stay as it is.

## Hint

- Add to the number in place rather than writing a new total by hand.
- Removing a field is a separate command that takes the key and the field name.

## Solution

```redis
HINCRBY user:105 xp 150
HDEL user:105 joined_on
```
