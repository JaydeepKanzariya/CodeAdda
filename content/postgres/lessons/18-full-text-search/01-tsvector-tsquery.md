---
id: tsvector-tsquery
title: "to_tsvector, to_tsquery and @@"
chapter: Full-text search
order: 1
dataset: food
check: rows-unordered
---

`LIKE '%word%'` only matches exact characters, so a search for "noodle" does not understand that "noodles" is the same word. PostgreSQL has built-in **full-text search** for this:
- `to_tsvector('english', text)` breaks text into normalised words called lexemes (for example "engines" becomes `engin`) and drops common words like "the".
- `to_tsquery('english', query)` turns search words into lexemes the same way. Combine words with `&` (and), `|` (or) and `!` (not).
- `@@` is true when a `tsvector` matches a `tsquery`.

```sql
SELECT to_tsvector('english', 'PostgreSQL database engines') @@ to_tsquery('english', 'engine') AS matches;
```

## Context

The query word is stemmed too, so a singular search finds plurals:

```sql
SELECT id, body
FROM reviews
WHERE to_tsvector('english', body) @@ to_tsquery('english', 'noodle');
```

## Task

From `reviews`, return `id`, `rating` and `body` for every review whose `body` matches the search word `'spicy'`, using the `english` configuration.

## Hint

- Turn the body into a `tsvector`, turn the search word into a `tsquery`, and match them with `@@` in the `WHERE` clause.

## Solution

```sql
SELECT id, rating, body
FROM reviews
WHERE to_tsvector('english', body) @@ to_tsquery('english', 'spicy');
```
