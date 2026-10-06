---
id: hset-hget
title: Objects as hashes
chapter: Hashes
order: 1
dataset: platform
check: state
checkQuery: SNAPSHOT user:113
---

A player profile has several parts: a name, a tier, a country, an XP total. You could store each one as its own string key (`user:104:name`, `user:104:tier` …), but then a profile is scattered over many keys. A **hash** keeps them together: one key, `user:104`, holding a small map of fields to values. It is the Redis way to store an object.

`HSET key field value [field value ...]` writes one or more fields and replies with how many of them were **new**. `HGET key field` returns one field's value, or `(nil)` if the field doesn't exist. Every value is a string, just like a string key.

```
redis> HGET user:103 name
"Yuki Tanaka"
redis> HGET user:103 nickname
(nil)
```

`HSET` merges: it changes the fields you name and leaves every other field alone. `HSET user:104 tier plus` upgrades Nora but keeps her email, XP and the rest. That's usually what you want, but it means `HSET` cannot "replace the whole object"; for that you would delete the key first. Older code uses `HMSET`, which does the same as a multi-field `HSET` and simply replies `OK`.

## Watch it happen

```yaml
tables:
  user_104:
    label: user:104 -- one key, six fields
    columns: [field, value]
    rows:
      - [name, Nora Okafor]
      - [email, nora@arcade.test]
      - [tier, free]
      - [xp, "430"]
      - [joined_on, "2025-04-08"]
      - [country, NG]
  user_104_after:
    label: user:104 after HSET user:104 tier plus
    columns: [field, value]
    rows:
      - [name, Nora Okafor]
      - [email, nora@arcade.test]
      - [tier, plus]
      - [xp, "430"]
      - [joined_on, "2025-04-08"]
      - [country, NG]
steps:
  - label: One key, many fields
    caption: "The whole profile of player 104 lives under the single key user:104."
    show: [user_104]
  - label: Read one field
    caption: "HGET user:104 xp replies \"430\" without fetching the other five fields."
    show: [user_104]
    highlight: [{ table: user_104, row: 4, tone: focus }]
  - label: Change one field
    caption: "HSET user:104 tier plus replies (integer) 0: tier already existed, so no field was new. The value still changed."
    show: [user_104_after]
    highlight: [{ table: user_104_after, cell: [3, value], tone: kept }]
    notes:
      - { title: "Merge, not replace", text: "The other five fields are untouched." }
  - label: Ask for a missing field
    caption: "HGET user:104 nickname replies (nil). The hash has no such field, and that is not an error."
    show: [user_104_after]
```

## Context

The reply to `HSET` counts only fields that did not exist before. Here `rating` already exists and `studio` is new, so the reply is `1` even though two fields were written:

```redis
HSET game:8 rating 4.1 studio "Lowlight Games"
```

## Task

Create the profile of a new player under `user:113` as a hash with exactly four fields: `name` "Mira Okafor", `tier` pro, `country` IN and `xp` 250. Then read back the `name` field.

## Hint

- One write can carry all four field and value pairs, one after another.
- Quote the name because of the space; the other values are single words.

## Solution

```redis
HSET user:113 name "Mira Okafor" tier pro country IN xp 250
HGET user:113 name
```
