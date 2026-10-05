---
id: sort-limit
title: Sorting and limiting in a pipeline
chapter: Aggregation Pipeline
order: 30
dataset: stream
check: rows-ordered
---

In an aggregation pipeline, `$sort` and `$limit` operate as dedicated pipeline stages rather than cursor methods.

Because stages execute sequentially from left to right, placing `$sort` after a `$group` stage orders the grouped aggregates. Following it with a `$limit` stage restricts the output stream to the top results (such as a top-N leaderboard).

## Context

To find the 3 longest movies using pipeline stages:

```js
db.movies.aggregate([
  { $sort: { runtime: -1 } },
  { $limit: 3 },
  { $project: { _id: 0, title: 1, runtime: 1 } }
])
```

## Task

Write an aggregation pipeline on the `movies` collection that builds a leaderboard of the top 3 directors by average audience score (`ratings.audience`). Return one document per director, with the director's name (`details.director`) as `_id` and their average audience score as `avg_score`, ordered from highest to lowest average and keeping only the first 3.

## Hint

- You need one document per director before you can rank them, so the grouping stage comes first; there is an accumulator that averages a field.
- Ranking and cutting happen after grouping, in that order: sort on the computed field (highest first), then keep only the leaders.

## Solution

```js
db.movies.aggregate([
  { $group: { _id: '$details.director', avg_score: { $avg: '$ratings.audience' } } },
  { $sort: { avg_score: -1 } },
  { $limit: 3 }
])
```

