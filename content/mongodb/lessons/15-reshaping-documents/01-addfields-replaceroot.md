---
id: addfields-replaceroot
title: $addFields and $replaceRoot
chapter: Reshaping Documents
order: 39
dataset: stream
check: rows-unordered
---

While `$project` reshapes documents by explicitly enumerating fields to keep or drop, MongoDB provides two stages for directly reorganizing documents:
- `$addFields`: adds new fields or overrides existing fields in incoming documents while preserving all other untouched fields.
- `$replaceRoot`: substitutes the current document with a specified sub-document via `newRoot`.

Combining `$addFields` and `$replaceRoot` is a common pattern for lifting an embedded sub-document to the top level while injecting selected parent fields into it.

## Context

To add a calculated decade field to movies while retaining all original properties:

```js
db.movies.aggregate([
  { $addFields: { decade: { $subtract: ['$year', { $mod: ['$year', 10] }] } } },
  { $project: { _id: 0, title: 1, decade: 1 } }
])
```

## Task

Write an aggregation pipeline on the `movies` collection that outputs one document per film made only of that film's `details` fields (`director`, `country`, `language`) plus the film's `title`. Nothing else from the original movie document should remain, including `_id`.

## Hint

- Once a sub-document becomes the root, the parent's other fields are gone, so copy the title into `details` before swapping.
- Dot notation in the new field's name lets you add a field inside an existing sub-document.

## Solution

```js
db.movies.aggregate([
  { $addFields: { 'details.title': '$title' } },
  { $replaceRoot: { newRoot: '$details' } }
])
```

