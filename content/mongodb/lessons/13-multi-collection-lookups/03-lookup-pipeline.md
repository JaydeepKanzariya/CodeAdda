---
id: lookup-pipeline
title: Lookups with a pipeline
chapter: Multi-Collection Lookups
order: 36
dataset: stream
check: rows-unordered
---

While simple equality joins use `localField` and `foreignField`, more complex joins—such as applying conditions before joining or joining on multiple criteria—use an expressive `$lookup` with `let` and `pipeline`.

In this form:
- `let`: defines variables from the current collection's document (e.g. `{ uid: '$_id' }`).
- `pipeline`: executes an aggregation pipeline against the target collection. Inside the pipeline, reference defined variables using `$$variableName` and field values using `$fieldName` within `$expr`.

When the join itself is a plain equality, you can also combine the two forms: give `localField` and `foreignField` for the match and add a `pipeline` that only filters or reshapes the joined documents. Both styles produce the same result.

## Context

To find films that someone started but did not finish, by joining only the incomplete `watch_history` sessions (this uses the concise form):

```js
db.movies.aggregate([
  {
    $lookup: {
      from: 'watch_history',
      localField: '_id',
      foreignField: 'movie_id',
      pipeline: [{ $match: { completed: false } }],
      as: 'abandoned'
    }
  },
  { $project: { _id: 0, title: 1, abandoned_count: { $size: '$abandoned' } } },
  { $match: { abandoned_count: { $gt: 0 } } }
])
```

## Task

Write an aggregation pipeline on the `users` collection that attaches to each user only the reviews they wrote with a `rating` of 8 or higher, in an array named `top_reviews`. Return each user's `_id`, `name` and `top_reviews`. Users with no such reviews still appear, with an empty array.

## Hint

- Reviews link to users through `user_id`; the rating condition belongs inside the join's own pipeline so low-rated reviews never get attached.
- Inside that pipeline, the current user's `_id` is reachable only through a variable you define for it, and comparing a field with a variable needs `$expr`. (The concise form handles the user match for you instead.)

## Solution

```js
db.users.aggregate([
  {
    $lookup: {
      from: 'reviews',
      let: { uid: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$user_id', '$$uid'] },
                { $gte: ['$rating', 8] }
              ]
            }
          }
        }
      ],
      as: 'top_reviews'
    }
  },
  {
    $project: {
      _id: 1,
      name: 1,
      top_reviews: 1
    }
  }
])
```
