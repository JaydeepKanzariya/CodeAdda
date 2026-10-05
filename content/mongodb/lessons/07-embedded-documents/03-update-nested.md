---
id: update-nested
title: Updating nested fields
chapter: Embedded Documents
order: 19
dataset: stream
check: state
checkQuery: "db.movies.find().sort({ _id: 1 })"
---

To modify a field inside an embedded document without overwriting the rest of the sub-document, use dot notation with the `$set` operator.

Specifying `$set: { 'details.language': 'English' }` updates only the `language` property within `details`. All other nested properties, such as `director` and `country`, remain intact.

## Context

To update the country property inside movie 3's details sub-document:

```js
db.movies.updateOne({ _id: 3 }, { $set: { 'details.country': 'Belgium' } })
```

## Task

Write a query that updates film `1` in the `movies` collection, setting its nested `details.language` field to `'English'`.

## Hint

- Update a single document, found by its `_id`.
- Assign the new value through a quoted dot path, so the other fields inside `details` stay untouched.

## Solution

```js
db.movies.updateOne({ _id: 1 }, { $set: { 'details.language': 'English' } })
```

