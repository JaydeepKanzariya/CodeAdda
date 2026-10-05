---
id: genre-scorecard
title: Genre Scorecard
chapter: Aggregation & Power
order: 1
difficulty: Hard
check: rows-ordered
---

The programming team is evaluating catalog depth across different genres to balance short features and longer epics. A film tagged with several genres counts towards each of them.

## Tables

```text
Collection: movies

+-------------+---------+------------------------------------------+
| Field       | Type    | Description                              |
+-------------+---------+------------------------------------------+
| _id         | number  | Unique film identifier                   |
| title       | string  | Film title                               |
| genres      | array   | List of genre classifications            |
| runtime     | number  | Duration in minutes                      |
+-------------+---------+------------------------------------------+

Sample document:
{ "_id": 1, "title": "Paper Moons", "genres": ["Drama"], "runtime": 95 }
```

## Task

Build a scorecard with one document per genre:
- `_id`: the genre name
- `film_count`: how many films carry that genre
- `avg_runtime`: the average runtime of those films, rounded to 1 decimal place

Order the genres by `film_count` from most to fewest. When two genres have the same `film_count`, order them alphabetically by name.

## Example

```text
Input:
movies collection:
[
  { "_id": 1, "title": "Paper Moons", "genres": ["Drama"], "runtime": 95 },
  { "_id": 2, "title": "Iron Meridian", "genres": ["Action", "Sci-Fi"], "runtime": 118 },
  { "_id": 3, "title": "Deep Current", "genres": ["Sci-Fi", "Thriller"], "runtime": 131 },
  { "_id": 4, "title": "Glass Harbor", "genres": ["Drama", "Action"], "runtime": 104 },
  { "_id": 5, "title": "Ninth Signal", "genres": ["Sci-Fi"], "runtime": 142 }
]

Output:
[
  { "_id": "Sci-Fi", "film_count": 3, "avg_runtime": 130.3 },
  { "_id": "Action", "film_count": 2, "avg_runtime": 111 },
  { "_id": "Drama", "film_count": 2, "avg_runtime": 99.5 },
  { "_id": "Thriller", "film_count": 1, "avg_runtime": 131 }
]

Explanation: Sci-Fi has three films (118, 131, 142), averaging 130.33..., which rounds to 130.3. Action (118, 104) and Drama (95, 104) both have two films, so Action comes first alphabetically. Thriller has one film.
```

## Hint

- Each film has to appear once per genre before you can group by genre.
- One grouping stage can produce several accumulated values at once.
- Rounding is an expression you apply after the average exists, for example in a later stage.
- A sort can use more than one field; the later fields only break ties.

## Setup

```json
{
  "movies": [
    { "_id": 1, "title": "Paper Moons", "genres": ["Drama"], "runtime": 95 },
    { "_id": 2, "title": "Iron Meridian", "genres": ["Action", "Sci-Fi"], "runtime": 118 },
    { "_id": 3, "title": "Deep Current", "genres": ["Sci-Fi", "Thriller"], "runtime": 131 },
    { "_id": 4, "title": "Glass Harbor", "genres": ["Drama", "Action"], "runtime": 104 },
    { "_id": 5, "title": "Ninth Signal", "genres": ["Sci-Fi"], "runtime": 142 }
  ]
}
```

## Solution

```js
db.movies.aggregate([
  { $unwind: '$genres' },
  { $group: { _id: '$genres', film_count: { $sum: 1 }, avg_runtime: { $avg: '$runtime' } } },
  { $set: { avg_runtime: { $round: ['$avg_runtime', 1] } } },
  { $sort: { film_count: -1, _id: 1 } }
])
```
