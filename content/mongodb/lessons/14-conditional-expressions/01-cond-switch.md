---
id: cond-switch
title: $cond and $switch
chapter: Conditional Expressions
order: 37
dataset: stream
check: rows-unordered
---

MongoDB supports branching conditional logic inside aggregation expressions using `$cond` (an if-then-else ternary operator) and `$switch` (a multi-branch case expression).

The `$switch` operator accepts an array of `branches`, where each branch has a boolean `case` expression and a `then` value. Branches are tested in order and the first `case` that is true wins, so later branches only see documents the earlier ones rejected. If none of the branch cases evaluate to true, `$switch` returns the specified `default` value. Watch the boundaries: `$lt` excludes the threshold value itself, while `$lte` includes it.

## Context

To classify reviews as either positive or critical based on the rating:

```js
db.reviews.aggregate([
  {
    $project: {
      _id: 1,
      rating: 1,
      sentiment: {
        $cond: [{ $gte: ['$rating', 8] }, 'positive', 'critical']
      }
    }
  }
])
```

## Task

Write an aggregation pipeline on the `movies` collection that outputs each film's `title` (suppressing `_id`) along with a computed `length` category using `$switch`:
- `'short'` when `runtime` is under 100 minutes
- `'feature'` when `runtime` is 142 minutes or less (a film running exactly 142 minutes, such as Echoes of Orion, is a feature)
- `'epic'` for all other films

## Hint

- Order the branches from the shortest range upward; a film that reaches the second branch is already known not to be short.
- The feature threshold includes 142 itself, so pick the comparison that is true at the boundary; anything left over falls through to the fallback.

## Solution

```js
db.movies.aggregate([
  {
    $project: {
      _id: 0,
      title: 1,
      length: {
        $switch: {
          branches: [
            { case: { $lt: ['$runtime', 100] }, then: 'short' },
            { case: { $lte: ['$runtime', 142] }, then: 'feature' }
          ],
          default: 'epic'
        }
      }
    }
  }
])
```

