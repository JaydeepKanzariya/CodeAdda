---
id: ltrim-capped
title: Capped lists
chapter: Lists
order: 3
dataset: platform
check: state
checkQuery: SNAPSHOT feed:*
---

Every ArcadePulse player has an activity feed: level-ups, badges, wins. Nobody scrolls back through a year of events, and a list that grows forever wastes memory. The fix is a **capped list**: push each new event onto the front, then cut the list down to the newest N.

`LTRIM key start stop` keeps the items from `start` to `stop` (both inclusive, negative positions allowed, just like `LRANGE`) and throws away everything else. It always replies `OK`. Paired with `LPUSH` it gives you "latest N":

```
redis> LRANGE feed:101 0 2
1) "levelup:7"
2) "badge:speedrun"
3) "quest:desert"
```

`feed:101` stores the newest event on the left, so index `0` is the most recent. After an `LPUSH` the new event takes index `0` and everything else shifts right by one; trimming to `0 9` then keeps ten items and drops the oldest ones on the right.

The classic mistake is to think `LTRIM` deletes the range you name. It does the opposite: it **keeps** that range. `LTRIM feed:101 0 9` keeps ten items, not nine and not eleven. And if `start` ends up after `stop`, nothing is kept, the list is emptied and its key is deleted.

## Context

`LPUSH` replies with the new length, which tells your code whether a trim is needed at all. Player 102 has no feed yet; the push creates it and reports two items:

```redis
LPUSH feed:102 levelup:2 win:game:5
LLEN feed:102
```

## Task

Player 101 just finished a match. Add the event `event:match:113` as the newest entry of `feed:101`, then cap the feed so that only the 10 newest entries remain, the new event included.

## Hint

- The newest entries live at the left end of this feed.
- The trim keeps the positions you name, and both ends count.

## Solution

```redis
LPUSH feed:101 event:match:113
LTRIM feed:101 0 9
```
