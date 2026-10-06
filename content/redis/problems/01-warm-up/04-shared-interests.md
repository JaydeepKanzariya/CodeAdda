---
id: shared-interests
title: Shared Interests
chapter: Warm-up
order: 4
difficulty: Easy
check: rows-unordered
---

The matchmaking screen suggests a game mode two players will both enjoy. Each player's interest tags are stored as a set, and the suggestion should only use tags that appear on both profiles.

## Tables

| Key | Type | Sample value from the Setup |
|---|---|---|
| `tags:user:104` | set | `racing`, `co-op`, `puzzle`, `retro` |
| `tags:user:107` | set | `racing`, `co-op`, `strategy` |
| `tags:user:110` | set | `puzzle`, `racing`, `indie` |

## Task

Return the tags that players **104** and **107** both have, one tag per row in a `value` column. Row order does not matter.

## Example

**Input**

```text
tags:user:104 = { racing, co-op, puzzle, retro }
tags:user:107 = { racing, co-op, strategy }
tags:user:110 = { puzzle, racing, indie }
```

**Output**

```text
value
co-op
racing
```

**Explanation:** Only `co-op` and `racing` are in both sets. `puzzle` is shared by 104 and 110, but player 110 is not part of this match, so it does not count.

## Hint

- You want the overlap of two sets, not everything either player likes.
- Redis can compute the overlap on the server and send back only the result.

## Setup

```redis
SADD tags:user:104 racing co-op puzzle retro
SADD tags:user:107 racing co-op strategy
SADD tags:user:110 puzzle racing indie
```

## Solution

```redis
SINTER tags:user:104 tags:user:107
```
