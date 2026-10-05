---
id: action-adventure
title: Action-Adventure Picks
chapter: Everyday MongoDB
order: 2
difficulty: Medium
check: rows-unordered
---

A promotional campaign is targeting viewers who enjoy high-energy stories that combine both thrills and epic exploration.

## Tables

```text
Collection: movies

+-------------+---------+------------------------------------------+
| Field       | Type    | Description                              |
+-------------+---------+------------------------------------------+
| _id         | number  | Unique film identifier                   |
| title       | string  | Film title                               |
| genres      | array   | List of genre classifications            |
| runtime     | number  | Running time in minutes                  |
+-------------+---------+------------------------------------------+

Sample document:
{ "_id": 1, "title": "Echoes of Orion", "genres": ["Action", "Adventure", "Sci-Fi"], "runtime": 128 }
```

## Task

Find every film tagged with **both** `Action` and `Adventure`, in any position and in any order within `genres`. Other genres may appear too.

Each result should contain only `title` and `genres` (no `_id`). Order does not matter.

## Example

```text
Input:
movies collection:
[
  { "_id": 1, "title": "Echoes of Orion", "genres": ["Action", "Adventure", "Sci-Fi"], "runtime": 128 },
  { "_id": 2, "title": "Cipher Protocol", "genres": ["Action", "Thriller"], "runtime": 112 },
  { "_id": 3, "title": "Solaris Drift", "genres": ["Adventure", "Action"], "runtime": 141 },
  { "_id": 4, "title": "Borealis Express", "genres": ["Comedy", "Adventure"], "runtime": 97 }
]

Output:
[
  { "title": "Echoes of Orion", "genres": ["Action", "Adventure", "Sci-Fi"] },
  { "title": "Solaris Drift", "genres": ["Adventure", "Action"] }
]

Explanation: Echoes of Orion and Solaris Drift carry both genres (Solaris Drift lists them the other way round). Cipher Protocol lacks Adventure, and Borealis Express lacks Action.
```

## Hint

- Matching `genres` against a whole array only finds that exact array, in that exact order.
- There is an array operator that asks for several values to all be present, whatever the order.

## Setup

```json
{
  "movies": [
    { "_id": 1, "title": "Echoes of Orion", "genres": ["Action", "Adventure", "Sci-Fi"], "runtime": 128 },
    { "_id": 2, "title": "Cipher Protocol", "genres": ["Action", "Thriller"], "runtime": 112 },
    { "_id": 3, "title": "Solaris Drift", "genres": ["Adventure", "Action"], "runtime": 141 },
    { "_id": 4, "title": "Borealis Express", "genres": ["Comedy", "Adventure"], "runtime": 97 }
  ]
}
```

## Solution

```js
db.movies.find({ genres: { $all: ['Action', 'Adventure'] } }, { _id: 0, title: 1, genres: 1 })
```
