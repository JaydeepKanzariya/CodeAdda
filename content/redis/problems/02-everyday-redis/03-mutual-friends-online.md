---
id: mutual-friends-online
title: Mutual Friends Online
chapter: Everyday Redis
order: 7
difficulty: Medium
check: rows-unordered
---

In the closed beta realm, players have short numeric IDs. Players 7 and 8 want to start a squad match and invite a third player they both know. The invite list should only show mutual friends who are online right now, because an offline player cannot accept.

## Tables

| Key | Type | Sample value from the Setup |
|---|---|---|
| `friends:7` | set of player IDs | `2`, `3`, `4`, `9`, `12` |
| `friends:8` | set of player IDs | `2`, `3`, `5`, `9`, `11` |
| `online:players` | set of player IDs | `2`, `3`, `5`, `7`, `8`, `12` |

## Task

Return the IDs of players who are friends with **both** player 7 and player 8 **and** are currently online, one ID per row in a `value` column. Row order does not matter.

## Example

**Input**

```text
friends:7      = { 2, 3, 4, 9, 12 }
friends:8      = { 2, 3, 5, 9, 11 }
online:players = { 2, 3, 5, 7, 8, 12 }
```

**Output**

```text
value
2
3
```

**Explanation:** The answer is players 2, 3. Player 9 is a mutual friend but is offline. Player 5 is online but only knows player 8, and player 12 is online but only knows player 7. Comparing just the two friend lists would wrongly add 9.

## Hint

- The overlap operation is not limited to two sets.
- Every condition in the task is "is a member of this set", so each condition is one more set in the overlap.

## Setup

```redis
SADD friends:7 2 3 4 9 12
SADD friends:8 2 3 5 9 11
SADD online:players 2 3 5 7 8 12
```

## Solution

```redis
SINTER friends:7 friends:8 online:players
```
