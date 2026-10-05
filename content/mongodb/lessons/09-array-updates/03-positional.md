---
id: positional
title: The positional $ operator
chapter: Array Updates
order: 25
dataset: stream
check: state
checkQuery: "db.movies.find().sort({ _id: 1 })"
---

When updating an embedded document inside an array, you often don't know the element's numeric index in advance. MongoDB solves this with the positional `$` operator.

The positional `$` operator acts as a placeholder in the update document, representing the first element of the array that satisfied the query filter. By matching the target element in the query condition (e.g. `'cast.actor': 'Ren Mori'`), you can refer to that specific item in the update path using `'cast.$.role'`.

## Context

To update actor Ren Mori's role title in movie 2:

```js
db.movies.updateOne({ _id: 2, 'cast.actor': 'Ren Mori' }, { $set: { 'cast.$.role': 'Cyber Courier' } })
```

## Task

Write a query that updates film `1` in the `movies` collection: find the cast entry for actor `'Jonas Dahl'` and change their `role` to `'Chief Architect'` using the positional `$` operator.

## Hint

- The `$` placeholder only knows which element to use if the filter itself matched an element of that array, so the filter needs a condition on the cast member as well as the film.
- In the update path, `$` stands in for the array index between the array name and the field you're changing.

## Solution

```js
db.movies.updateOne({ _id: 1, 'cast.actor': 'Jonas Dahl' }, { $set: { 'cast.$.role': 'Chief Architect' } })
```
