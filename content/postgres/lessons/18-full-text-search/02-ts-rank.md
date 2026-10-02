---
id: ts-rank
title: Ranking results with ts_rank
chapter: Full-text search
order: 2
dataset: food
check: rows-ordered
---

When a search matches many documents, you usually want the best matches first.

`ts_rank(vector, query)` gives each match a relevance score: the more often the query words appear in the document, the higher the score. Filter with `@@` so only matching rows are scored, then sort by the score. Review 5 mentions both "late" and "cold", so it ranks above the reviews that mention only one of them:

```sql
SELECT id,
  round(ts_rank(to_tsvector('english', body), to_tsquery('english', 'late | cold'))::numeric, 3) AS relevance
FROM reviews
WHERE to_tsvector('english', body) @@ to_tsquery('english', 'late | cold')
ORDER BY relevance DESC, id;
```

## Context

With `&`, a review must contain every word to match at all, and only those reviews get a score:

```sql
SELECT id,
  round(ts_rank(to_tsvector('english', body), to_tsquery('english', 'spicy & generous'))::numeric, 3) AS score
FROM reviews
WHERE to_tsvector('english', body) @@ to_tsquery('english', 'spicy & generous');
```

## Task

Search `reviews` for `'crispy | hot | fresh'` (english configuration) and return only the matching reviews with:
- `id`
- `rating`
- `rank`: the `ts_rank` score rounded to 3 decimal places
- `body`

Order the results by `rank` descending, then by `id` ascending.

## Hint

- Use the same `tsvector` and `tsquery` twice: once with `@@` to filter, once inside `ts_rank` to score.
- `round` needs a `numeric`, so cast the score before rounding.

## Solution

```sql
SELECT
  id,
  rating,
  round(ts_rank(to_tsvector('english', body), to_tsquery('english', 'crispy | hot | fresh'))::numeric, 3) AS rank,
  body
FROM reviews
WHERE to_tsvector('english', body) @@ to_tsquery('english', 'crispy | hot | fresh')
ORDER BY rank DESC, id;
```
