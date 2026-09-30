---
id: rollup
title: GROUP BY with ROLLUP
chapter: Advanced Topics
order: 5
dataset: shop
check: rows-unordered
---

`ROLLUP` adds a grand-total row to a grouped result.

## Context
`GROUP BY ROLLUP (col)` aggregates per value of `col`, then adds one extra row for the total, where `col` comes back as `NULL`. With several columns it builds a hierarchy of subtotals.

## Task
Return the number of products per category as `category` and `products`, including categories
with no products, plus a grand-total row.

## Hint
- Join so that a category with no products still appears in the result, rather than being
  dropped.
- Count a column from the joined table instead of `COUNT(*)`, so an empty category counts as
  zero; `ROLLUP` on the grouping column adds the grand-total row.

## Solution
```sql
SELECT c.name AS category, COUNT(p.id) AS products FROM categories AS c LEFT JOIN products AS p ON p.category_id = c.id GROUP BY ROLLUP (c.name);
```
