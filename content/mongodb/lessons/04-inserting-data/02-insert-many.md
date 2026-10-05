---
id: insert-many
title: Inserting many documents
chapter: Inserting Data
order: 10
dataset: stream
check: state
checkQuery: "db.watch_history.find().sort({ _id: 1 })"
---

To insert multiple documents in a single operation, use `insertMany()`. Pass an array of documents to insert.

MongoDB validates each document and inserts them into the collection. If any document omits `_id`, an identifier is automatically created.

## Context

To add two new reviews in one call:

```js
db.reviews.insertMany([
  { movie_id: 2, user_id: 101, rating: 8, comment: 'Very witty script!' },
  { movie_id: 4, user_id: 102, rating: 7, comment: 'Peaceful and calm.' }
])
```

## Task

Insert two new streaming sessions into the `watch_history` collection using `insertMany()` (omit the `_id` field on both):

1. First session:
   - `user_id`: `102`
   - `movie_id`: `1`
   - `watched_at`: `'2026-03-01T20:00:00Z'`
   - `duration_mins`: `156`
   - `completed`: `true`

2. Second session:
   - `user_id`: `103`
   - `movie_id`: `3`
   - `watched_at`: `'2026-03-02T19:30:00Z'`
   - `duration_mins`: `142`
   - `completed`: `true`

## Hint

- Call `db.watch_history.insertMany()`.
- Pass an array containing the two document objects in order.

## Solution

```js
db.watch_history.insertMany([
  { user_id: 102, movie_id: 1, watched_at: '2026-03-01T20:00:00Z', duration_mins: 156, completed: true },
  { user_id: 103, movie_id: 3, watched_at: '2026-03-02T19:30:00Z', duration_mins: 142, completed: true }
])
```
