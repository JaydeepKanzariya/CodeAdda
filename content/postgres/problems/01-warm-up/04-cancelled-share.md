---
id: cancelled-share
title: Cancelled Share
chapter: Warm-up
order: 4
difficulty: Easy
check: rows-unordered
---

Operations needs a high-level overview of delivery reliability and order cancellation rates.

## Tables
```text
Table: Orders

+-------------+---------+
| Column Name | Type    |
+-------------+---------+
| id          | int     |
| status      | text    |
| total       | numeric |
+-------------+---------+
```
id is the primary key for this table.
status can be 'delivered', 'cancelled', or 'placed'.

## Task
Write a query on `orders` that returns a single row with:
1. `total_orders`: the number of orders
2. `cancelled_orders`: the number of orders whose status is `'cancelled'`
3. `cancellation_rate`: cancelled orders as a percentage of all orders, rounded to 2 decimal places

## Example
```text
Input:
Orders table:
+----+-----------+--------+
| id | status    | total  |
+----+-----------+--------+
| 1  | delivered | 350.00 |
| 2  | cancelled | 200.00 |
| 3  | delivered | 450.00 |
| 4  | delivered | 500.00 |
| 5  | cancelled | 150.00 |
+----+-----------+--------+

Output:
+--------------+------------------+-------------------+
| total_orders | cancelled_orders | cancellation_rate |
+--------------+------------------+-------------------+
| 5            | 2                | 40.00             |
+--------------+------------------+-------------------+

Explanation: 2 of the 5 orders were cancelled, so the cancellation rate is 2 * 100 / 5 = 40.00.
```

## Hint
- An aggregate can count only some of the rows if you attach `FILTER (WHERE ...)` to it.
- Dividing one integer by another drops the fraction. Bring a decimal number such as `100.0` into the calculation before dividing.

## Setup
```sql
CREATE TABLE orders (id INTEGER PRIMARY KEY, status TEXT NOT NULL, total NUMERIC(6,2) NOT NULL);
COMMENT ON TABLE orders IS 'Challenge table: orders';
INSERT INTO orders VALUES
  (1, 'delivered', 350.00),
  (2, 'cancelled', 200.00),
  (3, 'delivered', 450.00),
  (4, 'delivered', 500.00),
  (5, 'cancelled', 150.00);
```

## Solution
```sql
SELECT
  count(*) AS total_orders,
  count(*) FILTER (WHERE status = 'cancelled') AS cancelled_orders,
  round(count(*) FILTER (WHERE status = 'cancelled') * 100.0 / count(*), 2) AS cancellation_rate
FROM orders;
```
