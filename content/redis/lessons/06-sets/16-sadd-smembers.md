---
id: sadd-smembers
title: Unique members
chapter: Sets
order: 1
dataset: platform
check: state
checkQuery: SNAPSHOT tags:user:103
---

ArcadePulse lets players pick interest tags such as `rpg` or `co-op`, and the recommendation feed reads them back. A tag either applies to a player or it does not, so storing it twice would be a bug. A Redis **set** is built for exactly this: an unordered bag of unique strings, one key per player, like `tags:user:103`.

`SADD key member [member ...]` adds one or more members and replies with how many were **actually new**. Members already in the set are skipped silently, so you never need to check first. `SMEMBERS key` returns every member, `SISMEMBER key member` answers 1 or 0 for one member, `SCARD key` counts them and `SREM` removes them.

```redis
SADD tags:user:104 racing indie
```

User 104 already has `indie`, so the reply is `1`: only `racing` was added, and the set now holds three tags.

Two things catch people out. First, a set has no order: `SMEMBERS` can come back in any order in real Redis (this lab sorts the rows so they are easy to read). Second, members are compared byte for byte, so `Co-op` and `co-op` are two different tags. Normalise case in your application before you call `SADD`.

## Watch it happen

```yaml
tables:
  before:
    label: tags:user:103 -- the seeded set
    columns: [member]
    rows:
      - ["co-op"]
      - ["rpg"]
      - ["speedrun"]
  reply:
    label: SADD tags:user:103 puzzle strategy co-op
    columns: [command, result]
    rows:
      - ["SADD", 2]
  after:
    label: tags:user:103 -- after SADD
    columns: [member]
    rows:
      - ["co-op"]
      - ["puzzle"]
      - ["rpg"]
      - ["speedrun"]
      - ["strategy"]
steps:
  - label: Three tags already there
    caption: "Yuki (user 103) starts with rpg, co-op and speedrun."
    show: [before]
    highlight: [{ table: before, row: 1, tone: focus }]
  - label: Add three, one is a repeat
    caption: "SADD is asked for puzzle, strategy and co-op. co-op is already a member, so the reply counts only the 2 new ones."
    show: [before, reply]
    highlight: [{ table: reply, row: 1, tone: focus }]
    notes:
      - { title: "No error for duplicates", text: "A repeated member is skipped, not rejected. The reply tells you how many were new." }
  - label: Still one copy of each
    caption: "The set now has five members, and co-op still appears exactly once."
    show: [after]
    highlight: [{ table: after, row: 2, tone: kept }, { table: after, row: 5, tone: kept }]
```

## Context

Before showing a "friends online" badge, the app asks whether a single player is in the `online:users` set. Membership tests are constant time no matter how big the set grows. Here a new player, 104, logs in and is added to the online set, and then the app checks them:

```redis
SADD online:users 104
SISMEMBER online:users 104
```

## Task

Yuki (user 103) has just picked three more interests in the app: `puzzle`, `strategy` and `co-op`. Add all three to her tag set `tags:user:103`, written exactly in lower case. One of them is already there, and the set must still hold each tag only once.

## Hint

- One command can add several members to a set at once; list them after the key.
- You do not need to filter out `co-op` yourself, because a set ignores members it already holds.
- Expect a reply of 2, not 3: that number counts only the tags that were new.

## Solution

```redis
SADD tags:user:103 puzzle strategy co-op
```
