---
id: limit-skip
title: Limiting and skipping
chapter: Projections & Limits
order: 4
dataset: stream
check: rows-ordered
---

When working with large collections, you often want to paginate through documents. You can chain `.limit(n)` and `.skip(m)` onto `find()` to restrict how many documents are returned and how many leading matches are skipped.

MongoDB applies `.sort()`, `.skip()`, and `.limit()` in a consistent order regardless of the order they appear in your query: sorting first, then skipping, and finally limiting.

## Context

To view the second page of users (users 6 to 10 when ordered by `_id`, 5 per page):

```js
db.users.find().sort({ _id: 1 }).skip(5).limit(5)
```

## Task

Write a query that finds films 4 through 6 from the `movies` collection when sorted by `_id` ascending. Return the full documents.

## Hint

- Sort first so "film 4" has a fixed meaning.
- How many films come before it, and how many do you keep?

## Solution

```js
db.movies.find().sort({ _id: 1 }).skip(3).limit(3)
```
