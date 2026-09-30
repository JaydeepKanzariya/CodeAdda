---
id: subquery-from
title: Subquery in FROM
chapter: Subqueries
order: 2
dataset: shop
check: rows-unordered
---

A subquery in `FROM` acts as a temporary table for the outer query.

## Context
It must have an alias. This is handy for aggregating something that is already an aggregate.

```sql
SELECT MAX(product_count) AS most_products FROM (SELECT category_id, COUNT(*) AS product_count FROM products GROUP BY category_id) AS per_category;
```

## Task
Return the average number of orders per customer who has ordered at least once, rounded to 2
decimal places, as `avg_orders`.

## Hint
- First build a subquery that counts orders `GROUP BY user_id`.
- Then take the `AVG` of that count in the outer query, rounded to 2 decimals.

## Solution
```sql
SELECT ROUND(AVG(order_count), 2) AS avg_orders FROM (SELECT user_id, COUNT(*) AS order_count FROM orders GROUP BY user_id) AS per_user;
```
