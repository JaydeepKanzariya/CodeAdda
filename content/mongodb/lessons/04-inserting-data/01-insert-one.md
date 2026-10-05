---
id: insert-one
title: Inserting one document
chapter: Inserting Data
order: 9
dataset: stream
check: state
checkQuery: "db.users.find().sort({ _id: 1 })"
---

To insert a new document into a collection, use `insertOne()`. Pass a JavaScript object containing the fields and values of the new document.

Every document in MongoDB requires a primary key in the `_id` field. If you omit `_id` when calling `insertOne()`, MongoDB generates one automatically. Real MongoDB generates an `ObjectId` (a unique 12-byte value); this lab keeps things readable and uses the next integer `_id` in the collection instead.

## Context

To add a new movie to the catalog:

```js
db.movies.insertOne({ title: 'Desert Mirage', year: 2026, runtime: 105, genres: ['Adventure'] })
```

## Task

Insert a new user document into the `users` collection with the following details (do not supply an `_id` field):
- `name`: `'Fatima Zahra'`
- `email`: `'fatima@example.com'`
- `plan`: `'basic'`
- `joined_on`: `'2026-01-15'`

## Hint

- Call `db.users.insertOne()` passing a document with the four specified fields.
- Leave out `_id` so the engine assigns the next primary key automatically.

## Solution

```js
db.users.insertOne({ name: 'Fatima Zahra', email: 'fatima@example.com', plan: 'basic', joined_on: '2026-01-15' })
```
