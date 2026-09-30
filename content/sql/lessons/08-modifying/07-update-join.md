---
id: update-join
title: UPDATE with JOIN
chapter: Modifying Data
order: 7
dataset: shop
check: state
checkQuery: SELECT id, price FROM products ORDER BY id
---

Update rows in one table using values that live in another, with `UPDATE ... FROM`.

## Context
PostgreSQL joins in an `UPDATE` with a `FROM` clause. The `WHERE` both links the tables and picks the rows to change. Every product row that matches the join gets updated once.

## Task
Every product in the `Electronics` category is going on sale. Lower its `price` by 10%, rounded to 2 decimal places.

## Hint
- `UPDATE products p SET ... FROM categories c WHERE ...`
- Link `p.category_id = c.id` and filter on `c.name`.
- `ROUND(x, 2)` keeps two decimals.

## Solution
```sql
UPDATE products p SET price = ROUND(p.price * 0.9, 2) FROM categories c WHERE p.category_id = c.id AND c.name = 'Electronics';
```
