---
id: exists
title: Checking a field exists
chapter: Complex Queries
order: 15
dataset: stream
check: rows-unordered
---

Because MongoDB documents are schema-flexible, different documents in the same collection can have completely different sets of fields. When you want to find documents where a field is present or missing, use the `$exists` element operator.

Setting `{ field: { $exists: true } }` matches documents that contain the field (even if its value is `null`), while `{ field: { $exists: false } }` matches documents where the field is omitted entirely.

## Context

To find subscribers who do not have a `preferences` document on file:

```js
db.users.find({ preferences: { $exists: false } })
```

## Task

Write a query that finds all films from the `movies` collection that do not have a critics rating recorded (the `ratings.critics` field does not exist).

## Hint

- Reach the critics score with a quoted dot path.
- Use the element operator from the explanation, asking for documents where the field is absent.

## Solution

```js
db.movies.find({ 'ratings.critics': { $exists: false } })
```

