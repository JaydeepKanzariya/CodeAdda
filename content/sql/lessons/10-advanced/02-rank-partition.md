---
id: rank-partition
title: RANK Window Function
chapter: Advanced Topics
order: 2
dataset: shop
check: rows-unordered
---

`RANK()` numbers rows by an ordering, and `PARTITION BY` restarts the numbering for each group.

## Context
Tied rows share a rank and the next rank skips ahead, unlike `ROW_NUMBER`. Put `PARTITION BY` inside the same `OVER (...)` as the `ORDER BY` to rank within each group rather than across the whole table.

## Task
Return each product's `name`, `category_id`, and `price_rank` — its rank by price (highest
price is 1) within its own category.

## Hint
- `PARTITION BY` goes inside the same `OVER (...)` clause as the `ORDER BY`, and decides which
  rows count as one group.
- No outer `ORDER BY` is required — the check doesn't care about row order here.

## Solution
```sql
SELECT name, category_id, RANK() OVER (PARTITION BY category_id ORDER BY price DESC) AS price_rank FROM products;
```
