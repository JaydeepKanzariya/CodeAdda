---
id: multi-join
title: JOIN Multiple Tables
chapter: Joining Tables
order: 6
dataset: shop
check: rows-unordered
---

Chain as many `JOIN` clauses as you need to gather data spread across several tables.

## Context
Each join needs its own `ON` clause saying how it connects to what came before.

```sql
SELECT rv.rating, u.name AS reviewer, p.name AS product FROM reviews AS rv JOIN users AS u ON u.id = rv.user_id JOIN products AS p ON p.id = rv.product_id;
```

## Task
Return each order's `id`, the customer's name as `customer`, and the product's name as
`product`.

## Hint
- Join `orders` to `users`, then join the result to `products`.
- Match `orders.user_id` to `users.id`, and `orders.product_id` to `products.id`.

## Solution
```sql
SELECT o.id, u.name AS customer, p.name AS product FROM orders AS o JOIN users AS u ON u.id = o.user_id JOIN products AS p ON p.id = o.product_id;
```
