---
id: except
title: Rows in One but Not the Other with EXCEPT
chapter: Set Operators
order: 4
dataset: shop
check: rows-unordered
---

`EXCEPT` keeps the rows from the first `SELECT` that do **not** appear in the second. Order
matters here — unlike `UNION` and `INTERSECT`, swapping the two statements changes the answer.

Think of it as "everything on the left, minus whatever also shows up on the right".

```sql
SELECT category_id FROM products EXCEPT SELECT category_id FROM products WHERE stock = 0;
```

`EXCEPT` compares *values*, not individual rows: it drops every left-hand `category_id` that
shows up anywhere on the right, even once. So a category with one out-of-stock product and nine
in-stock ones still disappears completely from this result.

## Task
Return the countries that have users but no suppliers, as a single column `country`.

## Hint
- `EXCEPT` keeps rows from the left query, minus any value that also shows up on the right.
- Think about which table represents "has" and which represents "doesn't have".

## Solution
```sql
SELECT country FROM users EXCEPT SELECT country FROM suppliers;
```
