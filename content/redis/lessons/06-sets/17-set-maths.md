---
id: set-maths
title: Set maths
chapter: Sets
order: 2
dataset: platform
check: rows-unordered
---

"Players you might team up with" is a classic ArcadePulse feature: find people whose interests overlap with yours. Pulling two tag sets into the app and comparing them in a loop works, but Redis can do the comparison on the server and send back only the answer.

Three commands cover set maths, and each takes any number of keys:

- `SINTER a b ...` returns members found in **every** set (the overlap).
- `SUNION a b ...` returns members found in **any** set (everything, once).
- `SDIFF a b ...` returns members of the **first** set that are in none of the others.

```redis
SDIFF tags:user:101 tags:user:102
```

That replies with one member, `speedrun`: it is the only tag Amina (101) has that Mateo (102) does not. Swap the keys and you get `co-op` instead, because `SDIFF` reads "first set minus the rest", so order matters. `SINTER` and `SUNION` give the same answer in any order.

Watch out for typos in key names. A key that does not exist is treated as an **empty set**, not an error, so `SINTER tags:user:101 tags:usr:102` quietly returns nothing. If an intersection comes back empty when you expected members, check the key names before you doubt the data.

## Context

The matchmaking screen only invites pro-tier players who are online right now. Both facts already live in sets, `index:tier:pro` and `online:users`, so the overlap is the invite list:

```redis
SINTER index:tier:pro online:users
```

## Task

Amina (user 101) and Mateo (user 102) want to find a game they would both enjoy. Return the interest tags that appear in **both** of their tag sets, `tags:user:101` and `tags:user:102`. Return only the shared tags, in any order.

## Hint

- You want the overlap of two sets, not everything either player likes.
- One command takes both tag keys and does the comparison on the server.
- Expect two tags back. Four tags means you asked for everything either of them likes.

## Solution

```redis
SINTER tags:user:101 tags:user:102
```
