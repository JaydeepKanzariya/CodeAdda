---
id: delete
title: Deleting documents
chapter: Updating & Deleting
order: 13
dataset: stream
check: state
checkQuery: "db.reviews.find().sort({ _id: 1 })"
---

To remove documents from a collection, MongoDB provides `deleteOne()` and `deleteMany()`.

Both methods accept a filter document. `deleteOne()` removes only the first document matching the criteria, whereas `deleteMany()` removes every document that matches the filter.

## Context

To remove an obsolete watch session from the log:

```js
db.watch_history.deleteOne({ _id: 901 })
```

## Task

Write a query that deletes all documents from the `reviews` collection where the `rating` is strictly less than 3.

## Hint

- More than one review may match, so pick the method that removes all of them, not just the first.
- The filter uses the strictly-less-than operator from Comparison Operators.

## Solution

```js
db.reviews.deleteMany({ rating: { $lt: 3 } })
```
