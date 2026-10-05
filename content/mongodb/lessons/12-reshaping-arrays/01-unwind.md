---
id: unwind
title: Unwinding arrays
chapter: Reshaping Arrays
order: 31
dataset: stream
check: rows-unordered
---

Arrays in documents bundle multiple values together. To analyze array contents individually—for example, to count how many documents feature each distinct tag or genre—you need to deconstruct the array into individual documents.

The `$unwind` stage takes an array field path (like `'$genres'`) and outputs one document for each element in that array. All other fields from the original document are copied into each newly generated document.

## Watch it happen

```yaml
tables:
  movies_genres:
    label: movies -- before unwind
    columns: [title, genres]
    rows:
      - ["The Obsidian Coast", "Drama, Mystery"]
      - ["Neon Mirage", "Comedy, Sci-Fi"]
  unwound_stream:
    label: unwound -- 1 doc per array element
    columns: [title, genres]
    rows:
      - ["The Obsidian Coast", "Drama"]
      - ["The Obsidian Coast", "Mystery"]
      - ["Neon Mirage", "Comedy"]
      - ["Neon Mirage", "Sci-Fi"]
steps:
  - label: Document with array
    caption: "The genres field holds an array of strings in each movie document."
    show: [movies_genres]
  - label: Deconstruct with $unwind
    caption: "$unwind duplicates the parent document for each array item, replacing the array with a single scalar value."
    show: [unwound_stream]
    highlight:
      - { table: unwound_stream, row: 1, tone: focus }
      - { table: unwound_stream, row: 2, tone: focus }
  - label: Ready for grouping
    caption: "Because each row now contains an individual genre string, subsequent $group stages can partition by genre."
    show: [unwound_stream]
    highlight:
      - { table: unwound_stream, row: 1, tone: kept }
      - { table: unwound_stream, row: 2, tone: kept }
      - { table: unwound_stream, row: 3, tone: kept }
      - { table: unwound_stream, row: 4, tone: kept }
```

## Context

To count how many movies carry each distinct tag:

```js
db.movies.aggregate([
  { $unwind: '$tags' },
  { $group: { _id: '$tags', count: { $sum: 1 } } }
])
```

## Task

Write an aggregation pipeline on the `movies` collection that:
1. Breaks each film's `genres` array apart so every genre is its own document.
2. Returns one document per genre, with the genre name as `_id` and the number of films in that genre as `count`.

## Hint

- Grouping on an array field directly would group by the whole list; split the array into one document per element first.
- After splitting, the same field name holds a single genre, so it can serve as the group key.

## Solution

```js
db.movies.aggregate([
  { $unwind: '$genres' },
  { $group: { _id: '$genres', count: { $sum: 1 } } }
])
```

