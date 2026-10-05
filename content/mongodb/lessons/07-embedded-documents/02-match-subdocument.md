---
id: match-subdocument
title: Matching a whole sub-document
chapter: Embedded Documents
order: 18
dataset: stream
check: rows-unordered
---

Instead of using dot notation for individual fields, you can match an entire embedded document by specifying the whole object: `{ details: { director: "...", country: "...", language: "..." } }`.

When matching an entire embedded document, MongoDB performs an exact document comparison. Every field must match, no extra fields can be present, and the order of keys inside the sub-document must match the stored order. Real MongoDB returns nothing if the keys are in a different order; this lab is lenient about key order, so always write the keys in the order they are stored. For this reason, dot notation is usually preferred for querying specific fields, while whole-document matching is reserved for exact shape validation.

## Context

To find the film matching the exact sub-document structure for director Amara Diop:

```js
db.movies.find({ details: { director: 'Amara Diop', country: 'France', language: 'French' } })
```

## Task

Write a query that finds every film from the `movies` collection whose entire embedded `details` document exactly equals:
```json
{ "director": "Kenji Sato", "country": "Japan", "language": "Japanese" }
```

## Hint

- Query the `movies` collection.
- Supply the entire object as the value for the `details` field.

## Solution

```js
db.movies.find({ details: { director: 'Kenji Sato', country: 'Japan', language: 'Japanese' } })
```

