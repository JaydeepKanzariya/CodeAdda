---
id: cte-aggregation
title: CTE for Complex Aggregation
chapter: Common Table Expressions
order: 3
dataset: shop
check: rows-ordered
---

Compute an aggregate inside a CTE, then filter and join on it in the outer query.

## Context
A CTE gives an aggregate a name, so the outer query can compare against it like any other column. That makes "above the average" questions easy: one CTE holds the per-group totals, and a subquery over the same CTE supplies the average.

## Task
List customers who spent more than the average customer, highest first, with their total. Return `name` and `total_spent`, where spend is quantity times price summed over a customer's orders.

## Hint
- Build a CTE that totals each customer's spend from `orders` joined to `products`.
- Compare each total with `(SELECT AVG(total_spent) FROM your_cte)`.

## Solution
```sql
WITH customer_spend AS (
  SELECT o.user_id, SUM(o.quantity * p.price) AS total_spent
  FROM orders o JOIN products p ON p.id = o.product_id
  GROUP BY o.user_id
)
SELECT u.name, cs.total_spent
FROM customer_spend cs JOIN users u ON u.id = cs.user_id
WHERE cs.total_spent > (SELECT AVG(total_spent) FROM customer_spend)
ORDER BY cs.total_spent DESC;
```
