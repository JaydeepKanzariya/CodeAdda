---
id: filter-size
title: $filter and $size
chapter: Reshaping Arrays
order: 33
dataset: stream
check: rows-unordered
---

When working with arrays inside documents, you often need to count or isolate elements that meet specific criteria without unwinding the entire document.

MongoDB provides array expression operators for this purpose:
- `$filter` selects a subset of an array according to a condition (`cond`), using `input` and an element variable (`as`).
- `$size` calculates the number of elements in an array.

Combining `$size` and `$filter` lets you count matching items within an embedded array directly in a `$project` stage.

## Context

To count how many tags each movie has:

```js
db.movies.aggregate([
  { $project: { _id: 0, title: 1, tag_count: { $size: { $ifNull: ['$tags', []] } } } }
])
```

## Task

Write an aggregation pipeline on the `movies` collection that projects each film's `title` and a field named `lead_count` (suppressing `_id`). Compute `lead_count` as the number of elements in `cast` where the member's `role` contains `'Lead'`, using `$size` with `$filter` and `$regexMatch`.

## Hint

- Work from the inside out: first narrow `cast` down to the matching members, then count what is left.
- Inside `cond`, the regex test needs the element variable you named in `as`, referenced with a double `$$` prefix, not the outer `cast` field.

## Solution

```js
db.movies.aggregate([
  {
    $project: {
      _id: 0,
      title: 1,
      lead_count: {
        $size: {
          $filter: {
            input: '$cast',
            as: 'c',
            cond: { $regexMatch: { input: '$$c.role', regex: 'Lead' } }
          }
        }
      }
    }
  }
])
```

