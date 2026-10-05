---
id: match-project
title: $match and $project
chapter: Aggregation Pipeline
order: 28
dataset: stream
check: rows-unordered
---

The MongoDB aggregation pipeline transforms documents through a sequence of stages. Each stage takes the output of the preceding stage as its input.

Two of the most foundational stages are `$match` and `$project`:
- `$match` filters documents using standard MongoDB query syntax, reducing the number of documents that pass downstream.
- `$project` reshapes documents, allowing you to include, exclude, or compute new fields using expression operators such as `$divide`.

## Watch it happen

```yaml
tables:
  movies_stream:
    label: movies -- input
    columns: [title, year, runtime]
    rows:
      - ["The Obsidian Coast", 2018, 156]
      - ["Neon Mirage", 2021, 88]
      - ["Echoes of Orion", 2015, 142]
  pipeline_output:
    label: movies -- $project { title, hours }
    columns: [title, hours]
    rows:
      - ["The Obsidian Coast", 2.6]
      - ["Neon Mirage", 1.4667]
steps:
  - label: Input documents
    caption: "The collection supplies documents with raw runtime in minutes and release years."
    show: [movies_stream]
  - label: "Stage 1: $match"
    caption: "The $match stage filters out Echoes of Orion because its year (2015) is not strictly greater than 2015."
    show: [movies_stream]
    highlight: [{ table: movies_stream, row: 3, tone: removed }]
  - label: "Stage 2: $project"
    caption: "$project suppresses _id, keeps title, and divides runtime by 60 to compute hours."
    show: [pipeline_output]
    highlight:
      - { table: pipeline_output, row: 1, tone: kept }
      - { table: pipeline_output, row: 2, tone: kept }
```

## Context

To find short films under 100 minutes and project only their title and year:

```js
db.movies.aggregate([
  { $match: { runtime: { $lt: 100 } } },
  { $project: { _id: 0, title: 1, year: 1 } }
])
```

## Task

Write an aggregation pipeline on the `movies` collection that:
1. Filters for films released after 2015 (`year` strictly greater than 2015) using `$match`.
2. Uses `$project` to output the `title` and a computed field `hours` (calculated by dividing `$runtime` by 60 using `$divide`), while suppressing `_id`.

## Hint

- `aggregate()` takes an array of stages; filter first so later stages see fewer documents.
- `$match` accepts the same filter syntax as `find()`.
- In `$project`, a new field's value can be an expression; inside expressions, refer to an existing field with a `$` prefix on its name.

## Solution

```js
db.movies.aggregate([
  { $match: { year: { $gt: 2015 } } },
  { $project: { _id: 0, title: 1, hours: { $divide: ['$runtime', 60] } } }
])
```

