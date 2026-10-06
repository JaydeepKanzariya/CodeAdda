---
id: first-key
title: Your first key
chapter: Meet Redis
order: 1
dataset: platform
check: state
checkQuery: SNAPSHOT player:*
---

Redis is a database that keeps everything in memory and finds data by name. Every piece of data lives under a **key**, a string such as `wallet:101`, and you ask for it by that exact name. There are no tables and no query planner, which is why ArcadePulse can read a player's wallet or a game's view count in well under a millisecond.

The two commands you will use most are `SET key value` and `GET key`. `SET` stores a string and replies `OK`; `GET` returns the string, or `(nil)` when no such key exists. Values that contain spaces need quotes, exactly as in a shell:

```
redis> GET wallet:101
"500"
redis> GET wallet:999
(nil)
```

One trap to remember from day one: `SET` replaces whatever was there and also wipes any expiry the key had. `session:alpha` is due to vanish in 120 seconds, but `SET session:alpha 101` would make it live forever. Add `KEEPTTL` (`SET session:alpha 101 KEEPTTL`) when you only want to change the value.

In this lab you type one command per line, and a line that starts with `#` is a comment. The comment rule is a lab convenience; the real `redis-cli` would try to run it as a command.

## Watch it happen

```yaml
tables:
  keys_before:
    label: a few keys already in the database
    columns: [key, type, value]
    rows:
      - [views:game:3, string, "95"]
      - [wallet:101, string, "500"]
      - [session:legacy, string, "106"]
  keys_after:
    label: the same keys after SET player:113:name
    columns: [key, type, value]
    rows:
      - [views:game:3, string, "95"]
      - [wallet:101, string, "500"]
      - [session:legacy, string, "106"]
      - [player:113:name, string, Mira Okafor]
steps:
  - label: Keys and values
    caption: "Each row is one key. The name on the left is all Redis needs to find the value on the right."
    show: [keys_before]
  - label: Read by name
    caption: "GET wallet:101 goes straight to that key and replies \"500\". Nothing else is scanned."
    show: [keys_before]
    highlight: [{ table: keys_before, row: 2, tone: focus }]
    notes:
      - { title: "Reply", text: "\"500\" comes back as a string, even though it looks like a number." }
  - label: Write a new key
    caption: "SET player:113:name \"Mira Okafor\" replies OK and a fourth key appears. No schema had to be created first."
    show: [keys_after]
    highlight: [{ table: keys_after, row: 4, tone: kept }]
  - label: Read it back
    caption: "GET player:113:name now returns \"Mira Okafor\", quotes and all, because the value holds a space."
    show: [keys_after]
    highlight: [{ table: keys_after, row: 4, tone: focus }]
```

## Context

`SET` never asks before it overwrites. Here the credits of player 102 change from 120 to 150 with no warning, and the final `GET` proves the old value is gone:

```redis
GET wallet:102
SET wallet:102 150
GET wallet:102
```

## Task

Player 113 has just signed up as "Mira Okafor". Store that display name as a string under the key `player:113:name`, then read it back to confirm it was saved.

## Hint

- The name contains a space, so wrap the whole value in double quotes.
- Writing takes a key and a value; reading back needs only the key.

## Solution

```redis
SET player:113:name "Mira Okafor"
GET player:113:name
```
