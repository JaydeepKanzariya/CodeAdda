---
id: in-nin
title: Lists with $in and $nin
chapter: Comparison Operators
order: 8
dataset: stream
check: rows-unordered
---

When you want to test whether a field matches any value from a set of choices, use `$in`. The `$in` operator takes an array of values and matches any document where the field equals at least one element in that array.

Its counterpart, `$nin`, matches documents where the specified field does not match any element of the array. Watch out: `$nin` also matches documents where the field is missing entirely, because a missing field equals none of the listed values.

## Context

To find movies released in specific milestone years (2000, 2012, or 2024):

```js
db.movies.find({ year: { $in: [2000, 2012, 2024] } })
```

## Task

Write a query that finds all users whose subscription `plan` is either `free` or `basic`.

## Hint

- Target the `users` collection.
- Use the operator that accepts a list of allowed values, and put both plan names in that list.

## Solution

```js
db.users.find({ plan: { $in: ['free', 'basic'] } })
```
