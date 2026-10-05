---
id: count
title: Counting documents
chapter: Counting & Distinct
order: 26
dataset: stream
check: rows-unordered
---

To count how many documents match a query without retrieving the full documents over the network, use `countDocuments()`.

Pass a filter document to `countDocuments()` to count matching records, or pass an empty filter `{}` (or omit the argument) to count all documents in the collection. In real MongoDB the method returns a plain number; this lab shows that number as a single `count` row.

## Context

To find out how many users subscribe to the premium tier:

```js
db.users.countDocuments({ plan: 'premium' })
```

## Task

Write a query using `countDocuments()` that determines how many films in the `movies` collection have a `runtime` strictly greater than 120 minutes (longer than 2 hours).

## Hint

- `countDocuments()` takes the same filter document you would pass to `find()`.
- "Strictly greater than" points to one specific comparison operator; 120 itself must not count.

## Solution

```js
db.movies.countDocuments({ runtime: { $gt: 120 } })
```

