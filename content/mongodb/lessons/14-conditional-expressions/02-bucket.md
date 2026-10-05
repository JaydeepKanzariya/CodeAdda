---
id: bucket
title: Grouping into ranges with $bucket
chapter: Conditional Expressions
order: 38
dataset: stream
check: rows-ordered
---

When you need to group numeric values into discrete ranges—such as age brackets, salary tiers, or decades—MongoDB provides the `$bucket` aggregation stage.

The `$bucket` stage partitions incoming documents into buckets defined by the `boundaries` array. In MongoDB, bucket intervals are half-open: `[lower, upper)`. A document's value must be greater than or equal to the lower boundary and strictly less than the upper boundary. For example, a film released in exactly 2000 belongs to the `[2000, 2010)` bucket, not the 1990 bucket. Any values falling outside the boundaries land in the `default` bucket.

## Context

To group films into runtime tiers:

```js
db.movies.aggregate([
  {
    $bucket: {
      groupBy: '$runtime',
      boundaries: [60, 100, 140, 180],
      default: 'Other',
      output: { count: { $sum: 1 } }
    }
  }
])
```

## Task

Write an aggregation pipeline on the `movies` collection that counts films per release decade (`year`): the 1990s, 2000s, 2010s and 2020s. Each output document should have the decade's first year (1990, 2000, 2010 or 2020) as `_id` and the number of films in it as `count`, in ascending decade order. Any film outside those decades should go into a bucket labelled `'Other'`.

## Hint

- Boundaries are lower bounds plus one final upper bound, so four decades need five numbers; the last one closes the 2020s.
- The catch-all label and the per-bucket counter are both options of the same stage.

## Solution

```js
db.movies.aggregate([
  {
    $bucket: {
      groupBy: '$year',
      boundaries: [1990, 2000, 2010, 2020, 2030],
      default: 'Other',
      output: { count: { $sum: 1 } }
    }
  }
])
```

