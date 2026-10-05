---
id: addtoset
title: Collecting with $addToSet
chapter: Reshaping Arrays
order: 32
dataset: stream
check: rows-unordered
---

In an aggregation `$group` stage, accumulator operators don't just compute numbers like sums and averages. You can also assemble values into arrays.

The `$addToSet` accumulator collects unique values across all documents in a group into an array, discarding any duplicates. In contrast, the `$push` accumulator keeps every value including duplicates.

MongoDB does not promise any particular order for the elements `$addToSet` collects. When order matters, sort the array afterwards with the `$sortArray` expression, for example `{ $sortArray: { input: '$years', sortBy: 1 } }` in a later `$project` or `$set` stage (`1` for ascending, `-1` for descending).

## Context

To gather all distinct release years for films produced in each country:

```js
db.movies.aggregate([
  { $group: { _id: '$details.country', years: { $addToSet: '$year' } } }
])
```

## Task

Write an aggregation pipeline on the `watch_history` collection that returns one document per user, with the user's ID (`user_id`) as `_id` and an array called `watched_movies` holding the IDs of the movies that user has watched, each ID listed only once even if they watched that movie more than once. Sort each `watched_movies` array in ascending order.

## Hint

- Some users watched the same movie twice, so the accumulator must drop repeats rather than keep every value.
- The collected set comes back in no guaranteed order; add a stage after the group that rewrites the array in sorted form.

## Solution

```js
db.watch_history.aggregate([
  { $group: { _id: '$user_id', watched_movies: { $addToSet: '$movie_id' } } },
  { $project: { watched_movies: { $sortArray: { input: '$watched_movies', sortBy: 1 } } } }
])
```
