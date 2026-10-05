---
id: gt-lt
title: Greater and less than
chapter: Comparison Operators
order: 6
dataset: stream
check: rows-unordered
---

MongoDB provides comparison operators to match fields against ranges or thresholds. Instead of specifying an exact value, pass an operator object like `{ field: { $gt: value } }`.

The two fundamental comparison operators are `$gt` (greater than) and `$lt` (less than). For example, `{ runtime: { $lt: 90 } }` matches any document where the runtime is strictly less than 90.

## Context

To find movies with a short runtime under 100 minutes:

```js
db.movies.find({ runtime: { $lt: 100 } })
```

## Task

Write a query that finds all films from the `movies` collection with a `runtime` greater than 150 minutes.

## Hint

- Pick the operator that means strictly greater than.
- Put it inside an object on `runtime`, with the threshold from the task.

## Solution

```js
db.movies.find({ runtime: { $gt: 150 } })
```
