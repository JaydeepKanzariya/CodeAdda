---
id: projection
title: Choosing fields with a projection
chapter: Projections & Limits
order: 3
dataset: stream
check: rows-unordered
---

By default, MongoDB returns every field in matching documents. When you only need specific fields, pass a projection document as the second argument to `find(filter, projection)`.

In a projection, set a field name to `1` to include it, or `0` to exclude it. The `_id` field is included by default unless you explicitly set `_id: 0`. Except for `_id`, you cannot mix `1` and `0` in the same projection.

## Context

To retrieve only the names and emails of users while omitting the `_id` field:

```js
db.users.find({}, { name: 1, email: 1, _id: 0 })
```

## Task

Write a query that retrieves every film from the `movies` collection, including only the `title` and `year` fields, and suppressing `_id`.

## Hint

- You want every film, so the first argument filters nothing.
- The second argument lists the fields to keep, plus one field that is included unless you switch it off.

## Solution

```js
db.movies.find({}, { title: 1, year: 1, _id: 0 })
```
