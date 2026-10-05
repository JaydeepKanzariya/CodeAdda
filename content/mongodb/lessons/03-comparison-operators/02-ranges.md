---
id: ranges
title: Ranges with $gte and $lte
chapter: Comparison Operators
order: 7
dataset: stream
check: rows-unordered
---

The operators `$gte` (greater than or equal) and `$lte` (less than or equal) include boundary values. You can combine multiple comparison operators on the same field inside a single operator document to define a bounded range.

For example, `{ score: { $gte: 80, $lte: 90 } }` matches documents where `score` is between 80 and 90, including both 80 and 90.

## Context

To find reviews with a rating between 8 and 10 inclusive:

```js
db.reviews.find({ rating: { $gte: 8, $lte: 10 } })
```

## Task

Write a query that finds all films from the `movies` collection released between 2000 and 2009 inclusive (the 2000s decade).

## Hint

- Query the `movies` collection.
- Set conditions on `year` using both `$gte` and `$lte` within one object.

## Solution

```js
db.movies.find({ year: { $gte: 2000, $lte: 2009 } })
```
