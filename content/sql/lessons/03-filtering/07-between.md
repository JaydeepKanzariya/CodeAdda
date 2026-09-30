---
id: between
title: BETWEEN Operator
chapter: Filtering Data
order: 7
dataset: shop
check: rows-unordered
---

`BETWEEN low AND high` keeps values that fall inside a range, endpoints included.

## Context
It replaces two comparisons joined by `AND`, and it works on dates as well as numbers.

```sql
SELECT name, price FROM products WHERE price BETWEEN 20 AND 40;
```

## Task
Return the `id` and `order_date` of orders placed in February 2024.

## Hint
- Use `BETWEEN` on `order_date` with the first and last day of February as the bounds.

## Solution
```sql
SELECT id, order_date FROM orders WHERE order_date BETWEEN '2024-02-01' AND '2024-02-29';
```
