---
id: custom-id
title: Choosing your own _id
chapter: Inserting Data
order: 11
dataset: stream
check: state
checkQuery: "db.users.find().sort({ _id: 1 })"
---

While MongoDB automatically assigns an `_id` when one is not supplied, you can choose your own custom primary key by explicitly setting `_id` in the document.

The `_id` can be any unique value: an integer, a formatted string like an external customer UUID, or a slug. If you insert a document with an `_id` that already exists in the collection, MongoDB rejects it with a duplicate key error (`E11000`).

## Context

To insert a movie with an explicit code-style string identifier:

```js
db.movies.insertOne({ _id: 'MOV-CLASSIC-99', title: 'Solar Echoes', year: 1999 })
```

## Task

Insert a new subscriber into the `users` collection with an explicit string `_id`:
- `_id`: `'usr_beta_01'`
- `name`: `'Zane Parker'`
- `email`: `'zane@example.com'`
- `plan`: `'free'`
- `joined_on`: `'2026-02-10'`

## Hint

- Call `db.users.insertOne()`.
- Include `_id: 'usr_beta_01'` along with the other user attributes in your document.

## Solution

```js
db.users.insertOne({ _id: 'usr_beta_01', name: 'Zane Parker', email: 'zane@example.com', plan: 'free', joined_on: '2026-02-10' })
```

