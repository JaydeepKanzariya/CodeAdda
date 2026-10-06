---
id: page-view-counter
title: Page-View Counter
chapter: Warm-up
order: 2
difficulty: Easy
check: state
checkQuery: SNAPSHOT views:game:*
---

Every game page on ArcadePulse has its own view counter. Several web servers bump these counters at the same moment, so they must be changed in place by Redis rather than read, added to in the application and written back. A batch of fresh traffic has just come in from the edge servers.

## Tables

| Key | Type | Sample value from the Setup |
|---|---|---|
| `views:game:2` | string (integer) | `12` |
| `views:game:3` | string (integer) | `40` |
| `views:game:5` | string (integer) | `17` |

`views:game:9` does not exist yet: game 9 launched a few minutes ago.

## Task

Apply this traffic to the counters:

- game 2 was viewed **1** more time
- game 5 was viewed **5** more times
- game 9 received its **first** view, so its counter `views:game:9` must now exist with the value `1`

Game 3 had no new traffic and must stay at `40`.

## Example

**Input**

```text
views:game:2 = 12
views:game:3 = 40
views:game:5 = 17
(views:game:9 missing)
```

**Output** (every `views:game:*` key afterwards)

```text
key           type    ttl  value
views:game:2  string  -1   13
views:game:3  string  -1   40
views:game:5  string  -1   22
views:game:9  string  -1   1
```

**Explanation:** 12 + 1 gives 13 and 17 + 5 gives 22. Game 9 had no key at all; an increment treats a missing counter as 0, so the very first view creates it with the value 1 and no separate "create" step is needed.

## Hint

- There is a command that adds exactly one, and a sibling that adds any whole number you pass it.
- You do not need to check whether a counter exists before incrementing it.

## Setup

```redis
SET views:game:2 12
SET views:game:3 40
SET views:game:5 17
```

## Solution

```redis
INCR views:game:2
INCRBY views:game:5 5
INCR views:game:9
```
