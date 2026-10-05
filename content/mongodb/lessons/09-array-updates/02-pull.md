---
id: pull
title: Removing with $pull
chapter: Array Updates
order: 24
dataset: stream
check: state
checkQuery: "db.movies.find().sort({ _id: 1 })"
---

To remove items from an array inside existing documents, MongoDB provides the `$pull` operator.

The `$pull` operator removes all instances of a specified value or all elements matching a specified condition from an existing array. If an element appears multiple times in the array, `$pull` removes every occurrence. Documents whose array doesn't contain the value, or that have no such array at all, are left unchanged.

## Watch it happen

```yaml
tables:
  movies_tags_before:
    label: movies -- tags before $pull
    columns: [_id, title, tags]
    rows:
      - [1, "The Obsidian Coast", "award-winner, 4k, staff-pick"]
      - [2, "Neon Mirage", "indie, staff-pick"]
      - [6, "Sands of Kalari", "epic, award-winner"]
  movies_tags_after:
    label: movies -- tags after $pull
    columns: [_id, title, tags]
    rows:
      - [1, "The Obsidian Coast", "4k, staff-pick"]
      - [2, "Neon Mirage", "indie, staff-pick"]
      - [6, "Sands of Kalari", "epic"]
steps:
  - label: Scan tags arrays
    caption: "Multiple films include 'award-winner' alongside other descriptive tags in their tags array."
    show: [movies_tags_before]
  - label: Apply $pull operator
    caption: "$pull searches each tags array and strips out matching occurrences while leaving other items untouched."
    show: [movies_tags_before]
    highlight:
      - { table: movies_tags_before, row: 1, tone: removed }
      - { table: movies_tags_before, row: 3, tone: removed }
  - label: Cleaned tag lists
    caption: "The Obsidian Coast and Sands of Kalari have 'award-winner' removed; Neon Mirage is unchanged."
    show: [movies_tags_after]
    highlight:
      - { table: movies_tags_after, row: 1, tone: focus }
      - { table: movies_tags_after, row: 3, tone: focus }
```

## Context

To remove the `'4k'` tag from every movie in the catalog:

```js
db.movies.updateMany({}, { $pull: { tags: '4k' } })
```

## Task

Write a query that updates all documents in the `movies` collection, removing the tag `'award-winner'` from every film's `tags` array.

## Hint

- Every film should be considered, so the update needs a filter that matches all documents and a method that changes more than one.
- The operator you want removes matching values from an array rather than setting or unsetting the whole field.

## Solution

```js
db.movies.updateMany({}, { $pull: { tags: 'award-winner' } })
```
