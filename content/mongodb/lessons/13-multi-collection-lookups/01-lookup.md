---
id: lookup
title: Joining with $lookup
chapter: Multi-Collection Lookups
order: 34
dataset: stream
check: rows-unordered
---

In relational databases, queries combine tables using `JOIN`. In MongoDB, multi-collection joins are performed inside aggregation pipelines using the `$lookup` stage.

A standard `$lookup` stage specifies four properties:
- `from`: the target collection to join
- `localField`: the key field in the current collection
- `foreignField`: the matching key field in the target collection
- `as`: the name of the new array field where joined documents are stored

If a document has no matches in the target collection, the joined field is an empty array `[]`.

## Watch it happen

```yaml
tables:
  movies_list:
    label: movies -- local collection
    columns: [_id, title]
    rows:
      - [1, "The Obsidian Coast"]
      - [2, "Neon Mirage"]
      - [4, "Whispering Pines"]
  reviews_list:
    label: reviews -- foreign collection
    columns: [_id, movie_id, rating]
    rows:
      - [501, 1, 10]
      - [502, 1, 9]
      - [503, 2, 8]
      - [525, 1, 9]
  joined_stream:
    label: joined -- after $lookup and $project
    columns: [title, review_count]
    rows:
      - ["The Obsidian Coast", 3]
      - ["Neon Mirage", 1]
      - ["Whispering Pines", 0]
steps:
  - label: Source collections
    caption: "The movies collection has _id, and reviews links back via movie_id."
    show: [movies_list, reviews_list]
  - label: Match on foreign keys
    caption: "$lookup matches localField _id with foreignField movie_id, gathering matches into an array."
    show: [movies_list, reviews_list]
    highlight:
      - { table: movies_list, row: 1, tone: focus }
      - { table: reviews_list, row: 1, tone: focus }
      - { table: reviews_list, row: 2, tone: focus }
      - { table: reviews_list, row: 4, tone: focus }
  - label: Output document shapes
    caption: "The Obsidian Coast has 3 reviews, Neon Mirage has 1, and Whispering Pines has 0 reviews."
    show: [joined_stream]
    highlight:
      - { table: joined_stream, row: 1, tone: kept }
      - { table: joined_stream, row: 2, tone: kept }
      - { table: joined_stream, row: 3, tone: kept }
```

## Context

To list each user next to the number of viewing sessions recorded for them in `watch_history`:

```js
db.users.aggregate([
  { $lookup: { from: 'watch_history', localField: '_id', foreignField: 'user_id', as: 'sessions' } },
  { $project: { _id: 0, name: 1, session_count: { $size: '$sessions' } } }
])
```

## Task

Write an aggregation pipeline on the `movies` collection that lists every film with the number of reviews it has received. Return each film's `title` and its number of reviews as `review_count`, without `_id`. Films with no reviews should still appear, with a count of 0.

## Hint

- Reviews point back to a film through their `movie_id`; join on that against the film's own `_id`.
- The joined matches arrive as an array, so the count you need is the length of that array.

## Solution

```js
db.movies.aggregate([
  {
    $lookup: {
      from: 'reviews',
      localField: '_id',
      foreignField: 'movie_id',
      as: 'movie_reviews'
    }
  },
  {
    $project: {
      _id: 0,
      title: 1,
      review_count: { $size: '$movie_reviews' }
    }
  }
])
```

