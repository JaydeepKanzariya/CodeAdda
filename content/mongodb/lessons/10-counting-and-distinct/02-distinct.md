---
id: distinct
title: Distinct values
chapter: Counting & Distinct
order: 27
dataset: stream
check: rows-unordered
---

To extract all unique values for a field across a collection, use `distinct()`.

Pass the field name (or dot-notation path) as the first argument to `distinct()`. You can also pass an optional filter as the second argument to restrict the documents examined. Dot notation reaches into nested sub-documents. When the field holds an array, `distinct()` unwinds it and treats each element as a separate value; a sub-document value is not unwound and counts as one whole value.

## Context

To find all distinct subscription plans available in the user base:

```js
db.users.distinct('plan')
```

## Task

Write a query using `distinct()` that retrieves every unique director's name from the `movies` collection using the path `'details.director'`.

## Hint

- `distinct()` takes the field name as a string rather than a filter document.
- The director lives inside a sub-document, so the string needs dot notation.

## Solution

```js
db.movies.distinct('details.director')
```

