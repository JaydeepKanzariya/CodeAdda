---
id: exists
title: EXISTS Operator
chapter: Subqueries
order: 3
dataset: shop
check: rows-unordered
---

`EXISTS` is true when its subquery returns at least one row, and false when it returns none.

## Context
It ignores what the rows contain, which suits "has at least one matching..." questions. The inner query here refers to the outer row, making it a correlated subquery that runs once per outer row.

```sql
SELECT name FROM products AS p WHERE EXISTS (SELECT 1 FROM reviews AS r WHERE r.product_id = p.id);
```

## Task
Return the `name` of every user who has placed at least one order.

## Hint
- Write a correlated subquery over `orders` that matches the order's `user_id` to the user's
  `id`.
- Wrap it in `WHERE EXISTS (...)`.

## Solution
```sql
SELECT u.name FROM users AS u WHERE EXISTS (SELECT 1 FROM orders AS o WHERE o.user_id = u.id);
```
