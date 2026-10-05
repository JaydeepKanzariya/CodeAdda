---
id: all
title: Requiring several values with $all
chapter: Array Queries
order: 21
dataset: stream
check: rows-unordered
---

While matching a single value against an array is straightforward, matching multiple values simultaneously requires the `$all` operator.

The `$all` operator takes an array of elements and matches documents where the array contains every specified element, regardless of element order or the presence of additional elements in the array.

## Context

To find subscribers who list both `'Drama'` and `'Sci-Fi'` among their favorite genres:

```js
db.users.find({ 'preferences.favorite_genres': { $all: ['Drama', 'Sci-Fi'] } })
```

## Task

Write a query that finds all films from the `movies` collection whose `genres` array contains both `'Action'` and `'Adventure'`.

## Hint

- A plain value on `genres` checks for just one element; you need an operator that takes a list and requires every item in it.
- The order of that list doesn't matter, and extra genres on a film don't disqualify it.

## Solution

```js
db.movies.find({ genres: { $all: ['Action', 'Adventure'] } })
```

