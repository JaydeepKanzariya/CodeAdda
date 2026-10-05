---
id: elem-match
title: Matching array objects with $elemMatch
chapter: Array Queries
order: 22
dataset: stream
check: rows-unordered
---

When an array contains embedded documents, matching multiple criteria on the same array element requires `$elemMatch`.

If you write `{ 'cast.actor': 'A', 'cast.role': 'B' }` without `$elemMatch`, MongoDB returns documents where *any* cast member has actor A and *any* cast member has role B, even if they are two completely different people. The `$elemMatch` operator forces all criteria to match within the **same** array element.

## Watch it happen

```yaml
tables:
  cast_records:
    label: movies -- cast elements of films featuring Elena Rostova
    columns: [title, actor, role]
    rows:
      - ["The Obsidian Coast", "Elena Rostova", "Detective Miller"]
      - ["The Obsidian Coast", "Jonas Dahl", "Lead Architect"]
      - ["Cipher Protocol", "Elena Rostova", "Cryptanalyst"]
      - ["Cipher Protocol", "David Chen", "Detective Sergeant"]
      - ["Fallen Constellation", "Elena Rostova", "Investigator Gomez"]
      - ["Fallen Constellation", "Carlos Ramos", "Coroner"]
  elem_matched:
    label: movies -- matched by $elemMatch
    columns: [title, actor, role]
    rows:
      - ["The Obsidian Coast", "Elena Rostova", "Detective Miller"]
steps:
  - label: Two cast elements per film
    caption: "Each film's cast array holds separate objects, each with its own actor and role."
    show: [cast_records]
  - label: Without $elemMatch
    caption: "Separate dot-notation conditions would accept Cipher Protocol: one element has actor Elena Rostova, a different element has a Detective role."
    show: [cast_records]
    highlight:
      - { table: cast_records, row: 3, tone: focus }
      - { table: cast_records, row: 4, tone: focus }
    notes:
      - { title: "Cross-element match", text: "Without $elemMatch, each condition may be satisfied by a different array element." }
  - label: With $elemMatch
    caption: "$elemMatch tests one element at a time. Only Detective Miller is Elena Rostova and a Detective in the same element; Cipher Protocol and Fallen Constellation are rejected."
    show: [cast_records]
    highlight:
      - { table: cast_records, row: 1, tone: kept }
      - { table: cast_records, row: 3, tone: removed }
      - { table: cast_records, row: 4, tone: removed }
      - { table: cast_records, row: 5, tone: removed }
  - label: Single matching document
    caption: "Only The Obsidian Coast qualifies."
    show: [elem_matched]
    highlight:
      - { table: elem_matched, row: 1, tone: kept }
```

## Context

To find films where actor Aoi Tanaka plays a programmer role:

```js
db.movies.find({ cast: { $elemMatch: { actor: 'Aoi Tanaka', role: /Programmer/ } } })
```

## Task

Write a query that finds all films from the `movies` collection where a single cast member in the `cast` array has `actor: 'Elena Rostova'` and a `role` matching the regular expression `/Detective/`.

## Hint

- Two separate `'cast.…'` conditions can be satisfied by two different people in the same film; you need both conditions checked against one element.
- Put the conditions on the element's own fields (`actor`, `role`), without the `cast.` prefix, inside that operator.

## Solution

```js
db.movies.find({
  cast: {
    $elemMatch: {
      actor: 'Elena Rostova',
      role: /Detective/
    }
  }
})
```
