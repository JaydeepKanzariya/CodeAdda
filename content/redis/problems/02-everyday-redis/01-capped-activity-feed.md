---
id: capped-activity-feed
title: Capped Activity Feed
chapter: Everyday Redis
order: 5
difficulty: Medium
check: state
checkQuery: SNAPSHOT feed:*
---

The profile page shows a player's most recent activity, newest at the top. Each feed is a list whose head is the newest event. To stop feeds from growing without limit, the product team caps every feed at its **5** newest events.

## Tables

| Key | Type | Sample value from the Setup |
|---|---|---|
| `feed:user:113` | list (newest first) | `event:badge:113`, `event:score:113`, `event:friend:113`, `event:review:113`, `event:signup:113` |
| `feed:user:101` | list (newest first) | `event:score:101`, `event:signup:101` |

## Task

Player 113 just joined the Driftline launch tournament. Record the event `event:launch:113` as the **newest** entry of `feed:user:113`, then make sure that feed holds only its 5 newest events, newest first.

`feed:user:101` must not change.

## Example

**Input**

```text
feed:user:113 = [event:badge:113, event:score:113, event:friend:113, event:review:113, event:signup:113]
feed:user:101 = [event:score:101, event:signup:101]
```

**Output** (every `feed:*` key afterwards)

```text
key            type  ttl  value
feed:user:101  list  -1   [event:score:101, event:signup:101]
feed:user:113  list  -1   [event:launch:113, event:badge:113, event:score:113, event:friend:113, event:review:113]
```

**Explanation:** The new event goes in at the head, which briefly makes the feed 6 long. Trimming then keeps positions 0 to 4, so the oldest event, `event:signup:113`, falls off the tail. Keeping 0 to 5 would leave 6 events, and keeping the last five positions would throw away the event you just added.

## Hint

- Decide which end of the list is "newest" here and add to that end.
- After adding, cut the list down to a range of positions; list positions start at 0 and both ends of the range are kept.

## Setup

```redis
RPUSH feed:user:113 event:badge:113 event:score:113 event:friend:113 event:review:113 event:signup:113
RPUSH feed:user:101 event:score:101 event:signup:101
```

## Solution

```redis
LPUSH feed:user:113 event:launch:113
LTRIM feed:user:113 0 4
```
