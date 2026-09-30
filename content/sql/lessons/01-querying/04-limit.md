---
id: limit
title: LIMIT Results
chapter: Querying Data
order: 4
dataset: shop
check: rows-ordered
---

`LIMIT n` stops the result after `n` rows, which is good for peeking at a big table or asking "top 5" questions.

## Context
Without `ORDER BY` the row order is not guaranteed, so "the first 5" is vague. Pair `LIMIT` with `ORDER BY` whenever the choice of rows matters.

```sql
SELECT * FROM categories ORDER BY id LIMIT 3;
```

## Task
Return all columns of the 5 products with the lowest `id`, lowest first.

## Hint
- Sort with `ORDER BY id`, then add `LIMIT 5`.

## Solution
```sql
SELECT * FROM products ORDER BY id LIMIT 5;
```
