---
id: dot-notation
title: Dot notation
chapter: Embedded Documents
order: 17
dataset: stream
check: rows-unordered
---

Documents in MongoDB often contain embedded sub-documents. To query fields inside an embedded document, use dot notation: `'parentField.nestedField'`.

When using dot notation in query documents, the path must always be enclosed in quotation marks. Dot notation lets you query nested properties directly without matching the entire sub-document.

## Watch it happen

```yaml
tables:
  catalog:
    label: movies -- details.director check
    columns: [title, director, country]
    rows:
      - ["The Obsidian Coast", "Maren Holt", "Norway"]
      - ["Whispering Pines", "Sofia Morales", "Spain"]
      - ["Neon Mirage", "Kenji Sato", "Japan"]
      - ["Fallen Constellation", "Sofia Morales", "Mexico"]
  matches:
    label: movies -- matched by dot notation
    columns: [title, director, country]
    rows:
      - ["Whispering Pines", "Sofia Morales", "Spain"]
      - ["Fallen Constellation", "Sofia Morales", "Mexico"]
steps:
  - label: Inspect embedded field
    caption: "The details field contains a sub-document with director, country, and language properties."
    show: [catalog]
  - label: Match nested value
    caption: "The query path 'details.director' reaches inside the sub-document to check each value."
    show: [catalog]
    highlight:
      - { table: catalog, row: 2, tone: focus }
      - { table: catalog, row: 4, tone: focus }
  - label: Filtered results
    caption: "Only Whispering Pines and Fallen Constellation match director 'Sofia Morales'."
    show: [matches]
    highlight:
      - { table: matches, row: 1, tone: kept }
      - { table: matches, row: 2, tone: kept }
```

## Context

To find films produced in Japan by querying the nested country attribute:

```js
db.movies.find({ 'details.country': 'Japan' })
```

## Task

Write a query that finds all films from the `movies` collection where the director (`details.director`) is `'Sofia Morales'`.

## Hint

- The director lives inside the `details` sub-document.
- Join the parent and child field names with a dot, and wrap that path in quotes.

## Solution

```js
db.movies.find({ 'details.director': 'Sofia Morales' })
```

