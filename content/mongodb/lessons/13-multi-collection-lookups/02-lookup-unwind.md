---
id: lookup-unwind
title: Flattening joined arrays
chapter: Multi-Collection Lookups
order: 35
dataset: stream
check: rows-unordered
---

Because `$lookup` always places joined results inside an array—even for one-to-one or many-to-one relationships—the joined field is an array of documents.

To treat the joined record as a single embedded document instead of an array, follow `$lookup` with an `$unwind` stage. Once unwound, you can reference the joined document's fields directly using dot notation (such as `'$movie.title'`) in subsequent stages like `$project`.

Be aware that `$unwind` drops any document whose joined array is empty, so records without a match disappear from the output. If you need to keep them, use the long form `{ $unwind: { path: '$movie', preserveNullAndEmptyArrays: true } }`.

## Context

To join watch history records with their corresponding movie title:

```js
db.watch_history.aggregate([
  {
    $lookup: {
      from: 'movies',
      localField: 'movie_id',
      foreignField: '_id',
      as: 'movie'
    }
  },
  { $unwind: '$movie' },
  { $project: { _id: 1, user_id: 1, movie_title: '$movie.title' } }
])
```

## Task

Write an aggregation pipeline on the `reviews` collection that shows each review alongside the title of the film it is about. Return the review's `_id`, `rating` and `comment`, plus the film's title as a top-level field named `movie_title`.

## Hint

- Each review names its film by `movie_id`; join that against the movies' `_id`.
- The join gives you an array with one film in it. Flatten it into a single embedded document so you can reach the title with dot notation.

## Solution

```js
db.reviews.aggregate([
  {
    $lookup: {
      from: 'movies',
      localField: 'movie_id',
      foreignField: '_id',
      as: 'movie'
    }
  },
  { $unwind: '$movie' },
  {
    $project: {
      _id: 1,
      rating: 1,
      comment: 1,
      movie_title: '$movie.title'
    }
  }
])
```
