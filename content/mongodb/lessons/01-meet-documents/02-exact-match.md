---
id: exact-match
title: Matching an exact value
chapter: Meet Documents
order: 2
dataset: stream
check: rows-unordered
---

To filter documents, pass a query document inside `find({ field: value })`. MongoDB checks each document in the collection and returns only those where the field equals the exact value you provided.

Values can be numbers, strings, booleans, or other types. For example, `{ year: 2018 }` matches documents where the numeric year is exactly 2018.

## Context

To find every film released in 2018:

```js
db.movies.find({ year: 2018 })
```

## Task

Find all users who are currently on the `premium` subscription plan.

## Hint

- Query the `users` collection this time, not `movies`.
- Give `find()` a filter object that names the field holding the subscription plan. Text values need quotes.

## Solution

```js
db.users.find({ plan: 'premium' })
```
