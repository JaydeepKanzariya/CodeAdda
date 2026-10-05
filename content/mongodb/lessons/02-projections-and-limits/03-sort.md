---
id: sort
title: Sorting results
chapter: Projections & Limits
order: 5
dataset: stream
check: rows-ordered
---

To order query results, chain `.sort()` onto `find()`. The sort argument is an object specifying the field to sort by and the direction: `1` for ascending (smallest to largest) and `-1` for descending (largest to smallest).

When sorting on nested document fields, use quotes around the dot-separated path, such as `'ratings.audience': -1`.

## Watch it happen

```yaml
tables:
  movies_sample:
    label: movies -- a sample of 4 films, before sorting
    columns: [title, audience]
    rows:
      - ["The Obsidian Coast", 9.4]
      - ["Neon Mirage", 8.1]
      - ["Echoes of Orion", 9.0]
      - ["Sands of Kalari", 8.7]
  sorted_movies:
    label: the same 4 films -- sorted desc
    columns: [title, audience]
    rows:
      - ["The Obsidian Coast", 9.4]
      - ["Echoes of Orion", 9.0]
      - ["Sands of Kalari", 8.7]
      - ["Neon Mirage", 8.1]
steps:
  - label: Unordered documents
    caption: "A sample of four films from the catalog. Without a sort, documents arrive in no guaranteed order."
    show: [movies_sample]
  - label: Apply sort criteria
    caption: "Sorting by ratings.audience with -1 orders from the highest score down to the lowest."
    show: [movies_sample]
    notes:
      - { title: "Sort direction", text: "Use 1 for ascending (lowest first) and -1 for descending (highest first)." }
  - label: Final ordered stream
    caption: "Within this sample, The Obsidian Coast (9.4) comes first, followed by Echoes of Orion (9.0), Sands of Kalari (8.7), and Neon Mirage (8.1)."
    show: [sorted_movies]
    highlight: [{ table: sorted_movies, row: 1, tone: focus }]
```

## Context

To find the three longest films in the catalog ordered from longest to shortest:

```js
db.movies.find({}, { title: 1, runtime: 1, _id: 0 }).sort({ runtime: -1 }).limit(3)
```

## Task

Write a query that retrieves every film's `title` and its audience score (`ratings.audience`), without the `_id` field. Sort the results by audience score in descending order (highest score first).

## Hint

- Match every film, and use a projection to keep the title and the nested audience score (a quoted dot path) while hiding `_id`.
- Chain a sort on that same nested path, in the direction that puts the largest value first.

## Solution

```js
db.movies.find({}, { title: 1, 'ratings.audience': 1, _id: 0 }).sort({ 'ratings.audience': -1 })
```
