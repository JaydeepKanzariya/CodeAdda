---
id: facet
title: Several summaries at once with $facet
chapter: Reshaping Documents
order: 40
dataset: stream
check: rows-unordered
---

Normally, an aggregation pipeline processes documents in a single linear sequence. When you want to generate multiple independent aggregations—such as building dashboard cards or faceted navigation filters—running separate queries can be inefficient.

The `$facet` stage runs several sub-pipelines on the same input documents within one stage. Each sub-pipeline produces its own array of result documents, and all of those arrays are returned together in a single output document, one field per sub-pipeline.

## Context

To report the three most common genres alongside the catalog's average runtime in one query:

```js
db.movies.aggregate([
  {
    $facet: {
      topGenres: [
        { $unwind: '$genres' },
        { $group: { _id: '$genres', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 3 }
      ],
      runtime: [
        { $group: { _id: null, avg_runtime: { $avg: '$runtime' } } }
      ]
    }
  }
])
```

## Task

Write an aggregation pipeline on the `users` collection that returns a single document with two summaries:
- `byPlan`: one entry per plan, with the plan name as `_id` and the number of users on it as `count`, sorted by `_id` in ascending order
- `total`: a single entry whose `count` field holds the number of users overall

## Hint

- Each summary is its own sub-pipeline, named by the output field it fills.
- The plan summary is a grouping followed by a sort; the overall total has a dedicated stage that counts documents into a field you name.

## Solution

```js
db.users.aggregate([
  {
    $facet: {
      byPlan: [
        { $group: { _id: '$plan', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ],
      total: [
        { $count: 'count' }
      ]
    }
  }
])
```
