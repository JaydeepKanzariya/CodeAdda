---
id: films-per-decade
title: Films per Decade
chapter: Aggregation & Power
order: 3
difficulty: Hard
check: rows-ordered
---

A cultural analysis team is charting film distribution across distinct decades to understand archival strengths and catalog gaps. A decade starts in a year ending in 0, so 2010 belongs to the 2010s, not the 2000s.

## Tables

```text
Collection: movies

+-------------+---------+------------------------------------------+
| Field       | Type    | Description                              |
+-------------+---------+------------------------------------------+
| _id         | number  | Unique film identifier                   |
| title       | string  | Film title                               |
| year        | number  | Release year                             |
+-------------+---------+------------------------------------------+

Sample document:
{ "_id": 1, "title": "Borealis Express", "year": 1994 }
```

## Task

Count the films released in each decade. Return one document per decade that has at least one film:
- `_id`: the first year of the decade (for example `1990` for 1990 to 1999)
- `count`: the number of films released in that decade

Order the result from the oldest decade to the newest.

## Example

```text
Input:
movies collection:
[
  { "_id": 1, "title": "Borealis Express", "year": 1994 },
  { "_id": 2, "title": "Whispering Pines", "year": 2000 },
  { "_id": 3, "title": "Copper Sky", "year": 2004 },
  { "_id": 4, "title": "Lantern Bay", "year": 2009 },
  { "_id": 5, "title": "Clockwork Dawn", "year": 2010 },
  { "_id": 6, "title": "Silent Tides", "year": 2024 },
  { "_id": 7, "title": "Hollow Crown Road", "year": 1999 },
  { "_id": 8, "title": "Amber Frequency", "year": 2021 }
]

Output:
[
  { "_id": 1990, "count": 2 },
  { "_id": 2000, "count": 3 },
  { "_id": 2010, "count": 1 },
  { "_id": 2020, "count": 2 }
]

Explanation: 1994 and 1999 are in the 1990s. 2000, 2004 and 2009 are in the 2000s. 2010 starts the 2010s. 2021 and 2024 are in the 2020s.
```

## Hint

- You can compute a decade from a year with arithmetic, or let a range-grouping stage sort years into buckets for you.
- Check where the boundary years 2000 and 2010 land: the lower edge of a range is included, the upper edge is not.
- Make sure the decades come out oldest first.

## Setup

```json
{
  "movies": [
    { "_id": 1, "title": "Borealis Express", "year": 1994 },
    { "_id": 2, "title": "Whispering Pines", "year": 2000 },
    { "_id": 3, "title": "Copper Sky", "year": 2004 },
    { "_id": 4, "title": "Lantern Bay", "year": 2009 },
    { "_id": 5, "title": "Clockwork Dawn", "year": 2010 },
    { "_id": 6, "title": "Silent Tides", "year": 2024 },
    { "_id": 7, "title": "Hollow Crown Road", "year": 1999 },
    { "_id": 8, "title": "Amber Frequency", "year": 2021 }
  ]
}
```

## Solution

```js
db.movies.aggregate([
  {
    $bucket: {
      groupBy: '$year',
      boundaries: [1990, 2000, 2010, 2020, 2030],
      output: { count: { $sum: 1 } }
    }
  }
])
```
