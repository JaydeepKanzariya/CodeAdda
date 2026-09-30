---
id: join-where
title: JOIN with WHERE
chapter: Joining Tables
order: 7
dataset: shop
check: rows-unordered
---

Joins build the combined rows first, then `WHERE` filters them like any other result.

## Context
You can use columns from any joined table in the condition, and add as many conditions as you like.

```sql
SELECT rv.rating, p.name AS product FROM reviews AS rv JOIN products AS p ON p.id = rv.product_id WHERE rv.rating >= 4;
```

## Task
Return each order's `id`, `customer`, and `product` for customers in India only.

## Hint
- Start from the three-table join used in the previous lesson.
- Add `WHERE` on the customer's `country`.

## Solution
```sql
SELECT o.id, u.name AS customer, p.name AS product FROM orders AS o JOIN users AS u ON u.id = o.user_id JOIN products AS p ON p.id = o.product_id WHERE u.country = 'India';
```
