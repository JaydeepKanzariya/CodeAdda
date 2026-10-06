---
id: hgetall-hmget
title: Reading many fields
chapter: Hashes
order: 2
dataset: platform
check: rows-ordered
---

`HGET` reads one field, but most screens need several. ArcadePulse's game page wants the title, the price and the rating together, and the admin tool wants everything. Redis offers two commands so you never loop over `HGET`.

`HGETALL key` returns every field with its value. redis-cli prints them as alternating lines, field then value:

```
redis> HGETALL game:3
1) "title"
2) "Pixel Orchard"
3) "genre"
4) "puzzle"
5) "price"
6) "4.99"
7) "rating"
8) "4.2"
```

`HMGET key field [field ...]` returns only the fields you name, in the order you name them. A field that doesn't exist comes back as `(nil)` in its position. Player 112 never filled in a country:

```
redis> HMGET user:112 name country
1) "Elena Garcia"
2) (nil)
```

Prefer `HMGET` when you know which fields you need. `HGETALL` reads the whole hash every time; on a profile with six fields that is nothing, but on a hash with tens of thousands of fields it blocks the server while it builds the reply. Also don't rely on the order `HGETALL` gives you: real Redis usually keeps insertion order for small hashes (as above), while this lab lists fields alphabetically. If order matters to your code, ask for named fields.

## Context

A game card needs three fields from one hash, and `HMGET` brings them back in a single call, in the order the card displays them:

```redis
HMGET game:2 title price rating
```

## Task

The support team is looking at player 104. Return that player's `name`, `tier` and `country`, in exactly that order, and nothing else.

## Hint

- You need three specific fields, not the whole profile.
- The reply follows the order of the field names you pass.

## Solution

```redis
HMGET user:104 name tier country
```
