---
id: crowd-and-critics
title: Critics' and Audience Favourites
chapter: Everyday MongoDB
order: 1
difficulty: Medium
check: rows-unordered
---

The editorial board wants to highlight universally acclaimed titles that achieved high marks from both professional critics and everyday audiences.

## Tables

```text
Collection: movies

+------------------+---------+------------------------------------------+
| Field            | Type    | Description                              |
+------------------+---------+------------------------------------------+
| _id              | number  | Unique film identifier                   |
| title            | string  | Film title                               |
| ratings.critics  | number  | Critics score (0 to 100)                 |
| ratings.audience | number  | Audience rating (0.0 to 10.0)            |
+------------------+---------+------------------------------------------+

Sample document:
{ "_id": 1, "title": "The Obsidian Coast", "ratings": { "critics": 91, "audience": 9.4 } }
```

## Task

Find every film with a critics score of at least 85 **and** an audience rating of at least 8.5 (both limits count as passing).

Each result should contain only `title` and the two ratings, `ratings.critics` and `ratings.audience` (no `_id`). Order does not matter.

## Example

```text
Input:
movies collection:
[
  { "_id": 1, "title": "The Obsidian Coast", "ratings": { "critics": 91, "audience": 9.4 } },
  { "_id": 2, "title": "Neon Mirage", "ratings": { "critics": 78, "audience": 8.1 } },
  { "_id": 3, "title": "Echoes of Orion", "ratings": { "critics": 85, "audience": 9.0 } },
  { "_id": 4, "title": "Clockwork Dawn", "ratings": { "critics": 88, "audience": 8.2 } }
]

Output:
[
  { "title": "The Obsidian Coast", "ratings": { "critics": 91, "audience": 9.4 } },
  { "title": "Echoes of Orion", "ratings": { "critics": 85, "audience": 9.0 } }
]

Explanation: The Obsidian Coast (91, 9.4) and Echoes of Orion (exactly 85, 9.0) pass both limits. Clockwork Dawn has a strong critics score but its audience rating is only 8.2, and Neon Mirage misses both.
```

## Hint

- Two conditions on different fields in the same filter must both be true.
- Both ratings are nested inside `ratings`.
- "At least" includes the limit itself.

## Setup

```json
{
  "movies": [
    { "_id": 1, "title": "The Obsidian Coast", "ratings": { "critics": 91, "audience": 9.4 } },
    { "_id": 2, "title": "Neon Mirage", "ratings": { "critics": 78, "audience": 8.1 } },
    { "_id": 3, "title": "Echoes of Orion", "ratings": { "critics": 85, "audience": 9.0 } },
    { "_id": 4, "title": "Clockwork Dawn", "ratings": { "critics": 88, "audience": 8.2 } }
  ]
}
```

## Solution

```js
db.movies.find({ 'ratings.critics': { $gte: 85 }, 'ratings.audience': { $gte: 8.5 } }, { _id: 0, title: 1, 'ratings.critics': 1, 'ratings.audience': 1 })
```
