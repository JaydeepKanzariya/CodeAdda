---
id: short-features
title: Short Features
chapter: Warm-up
order: 2
difficulty: Easy
check: rows-unordered
---

Subscribers frequently search for quick movies when they have limited viewing time. The platform wants to identify short feature films that run 90 minutes or less.

## Tables

```text
Collection: movies

+-------------+---------+------------------------------------------+
| Field       | Type    | Description                              |
+-------------+---------+------------------------------------------+
| _id         | number  | Unique film identifier                   |
| title       | string  | Film title                               |
| runtime     | number  | Running time in minutes                  |
| genres      | array   | Associated genres                        |
+-------------+---------+------------------------------------------+

Sample document:
{ "_id": 1, "title": "Paper Lanterns", "runtime": 75, "genres": ["Drama"] }
```

## Task

Find every film that runs 90 minutes or less (a film of exactly 90 minutes counts).

Each result should contain only `title` and `runtime` (no `_id`). Order does not matter.

## Example

```text
Input:
movies collection:
[
  { "_id": 1, "title": "Paper Lanterns", "runtime": 75, "genres": ["Drama"] },
  { "_id": 2, "title": "The Long Road", "runtime": 135, "genres": ["Adventure"] },
  { "_id": 3, "title": "Fast Lane", "runtime": 90, "genres": ["Action"] },
  { "_id": 4, "title": "Harbor of Echoes", "runtime": 105, "genres": ["Mystery"] }
]

Output:
[
  { "title": "Paper Lanterns", "runtime": 75 },
  { "title": "Fast Lane", "runtime": 90 }
]

Explanation: Paper Lanterns (75 min) and Fast Lane (exactly 90 min) are short enough. The Long Road and Harbor of Echoes run longer than 90 minutes.
```

## Hint

- A comparison operator inside the filter can test a number against a limit.
- Think about whether the limit itself should be included.
- The second argument to `find()` chooses which fields come back.

## Setup

```json
{
  "movies": [
    { "_id": 1, "title": "Paper Lanterns", "runtime": 75, "genres": ["Drama"] },
    { "_id": 2, "title": "The Long Road", "runtime": 135, "genres": ["Adventure"] },
    { "_id": 3, "title": "Fast Lane", "runtime": 90, "genres": ["Action"] },
    { "_id": 4, "title": "Harbor of Echoes", "runtime": 105, "genres": ["Mystery"] }
  ]
}
```

## Solution

```js
db.movies.find({ runtime: { $lte: 90 } }, { _id: 0, title: 1, runtime: 1 })
```
