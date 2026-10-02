---
id: group-by-having
title: GROUP BY and HAVING
chapter: Aggregation
order: 2
dataset: food
check: rows-unordered
---

`GROUP BY` puts rows that share the same value(s) into one group, and each aggregate is then computed once per group — so you get one result row per group.

`WHERE` filters rows *before* they are grouped; `HAVING` filters whole groups *after* the aggregates are calculated, so it can test things like `count(*)`. This keeps only the cities with more than 3 customers (Mumbai and Bengaluru):

```sql
SELECT city, count(*) AS customer_count
FROM customers
GROUP BY city
HAVING count(*) > 3;
```

## Context

You can group the result of a join, too. This counts orders per customer city and keeps the cities with at least 10 orders:

```sql
SELECT c.city, count(o.id) AS orders
FROM customers c
JOIN orders o ON o.customer_id = c.id
GROUP BY c.city
HAVING count(o.id) >= 10;
```

## Task

Join `restaurants` and `orders` and find the restaurants that have received at least 5 orders. Return the restaurant's name aliased as `restaurant_name` and its number of orders aliased as `order_count`.

## Hint

- Make one group per restaurant, and count the orders in each group.
- A condition on a count belongs in `HAVING`, not `WHERE`.

## Solution

```sql
SELECT r.name AS restaurant_name, count(o.id) AS order_count
FROM restaurants r
JOIN orders o ON r.id = o.restaurant_id
GROUP BY r.name
HAVING count(o.id) >= 5;
```
