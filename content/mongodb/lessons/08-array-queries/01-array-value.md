---
id: array-value
title: Matching an array value
chapter: Array Queries
order: 20
dataset: stream
check: rows-unordered
---

When a document field holds an array of scalar values, you can query for an element without any special operators. Specifying `{ genres: 'Thriller' }` matches every document where the `genres` array contains `'Thriller'` as one of its elements.

MongoDB automatically inspects the contents of the array. The document matches whether the value is the only item in the array or one among many.

## Context

To find all films that have the tag `'staff-pick'` in their `tags` array:

```js
db.movies.find({ tags: 'staff-pick' })
```

## Task

Write a query that finds all films from the `movies` collection that include `'Thriller'` in their `genres` array.

## Hint

- No operator is needed for this one.
- Write the filter as if `genres` held a single value; MongoDB looks inside the array for you.

## Solution

```js
db.movies.find({ genres: 'Thriller' })
```

