---
id: multiple-ctes
title: Multiple CTEs
chapter: Common Table Expressions
order: 2
dataset: shop
check: rows-unordered
---

A `WITH` clause can define several CTEs, and each one can build on the ones before it.

## Context
Separate the CTEs with commas. A later CTE may select from an earlier one, so a hard problem reads top to bottom as a series of small named steps.

## Task
Return the revenue (quantity × price) earned per category that has at least one order, as `name`
and `revenue`.

## Hint
- First CTE: combine `orders` with the matching product so each order also carries a price,
  then work out what that order was worth.
- Second CTE: sum those order values per category, then join in the category name for the final
  `SELECT`.

## Solution
```sql
WITH order_totals AS (SELECT o.product_id, o.quantity * p.price AS total FROM orders AS o JOIN products AS p ON p.id = o.product_id), category_totals AS (SELECT p.category_id, SUM(t.total) AS revenue FROM order_totals AS t JOIN products AS p ON p.id = t.product_id GROUP BY p.category_id) SELECT c.name, ct.revenue FROM category_totals AS ct JOIN categories AS c ON c.id = ct.category_id;
```
