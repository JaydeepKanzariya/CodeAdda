---
id: days-between-orders
title: Days Between Orders
chapter: Power features
order: 3
difficulty: Hard
check: rows-ordered
---

Customer retention models evaluate how frequently customers return by calculating the elapsed time in days between successive orders.

## Tables
```text
Table: Orders

+-------------+-----------+
| Column Name | Type      |
+-------------+-----------+
| id          | int       |
| customer_id | int       |
| placed_at   | timestamp |
+-------------+-----------+
```
id is the primary key for this table.
placed_at is the timestamp when the order was placed.

## Task
Write a query that returns one row per order with:
- `customer_id`
- `order_date`: the calendar date the order was placed
- `days_since_last`: the number of whole days since the same customer's previous order (compare dates, not times), or `NULL` for a customer's first order

Order the result by `customer_id` ascending, then `order_date` ascending.

## Example
```text
Input:
Orders table:
+----+-------------+---------------------+
| id | customer_id | placed_at           |
+----+-------------+---------------------+
| 1  | 1           | 2026-03-01 10:00:00 |
| 2  | 1           | 2026-03-05 14:00:00 |
| 3  | 1           | 2026-03-06 18:00:00 |
| 4  | 2           | 2026-03-02 12:00:00 |
| 5  | 2           | 2026-03-10 16:00:00 |
+----+-------------+---------------------+

Output:
+-------------+------------+-----------------+
| customer_id | order_date | days_since_last |
+-------------+------------+-----------------+
| 1           | 2026-03-01 | NULL            |
| 1           | 2026-03-05 | 4               |
| 1           | 2026-03-06 | 1               |
| 2           | 2026-03-02 | NULL            |
| 2           | 2026-03-10 | 8               |
+-------------+------------+-----------------+

Explanation: For customer 1, March 5th is 4 days after March 1st and March 6th is 1 day after March 5th. Customer 2 waited 8 days between March 2nd and March 10th. First orders have no previous order, so they show NULL.
```

## Hint
- A window function can look at the row just before the current one.
- Each customer's orders form their own window.
- Subtracting one `date` from another gives a whole number of days.

## Setup
```sql
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL, placed_at TIMESTAMP NOT NULL);
COMMENT ON TABLE orders IS 'Challenge table: orders';
INSERT INTO orders VALUES
  (1, 1, '2026-03-01 10:00:00'),
  (2, 1, '2026-03-05 14:00:00'),
  (3, 1, '2026-03-06 18:00:00'),
  (4, 2, '2026-03-02 12:00:00'),
  (5, 2, '2026-03-10 16:00:00');
```

## Solution
```sql
SELECT
  customer_id,
  placed_at::date AS order_date,
  (placed_at::date - lag(placed_at::date) OVER (PARTITION BY customer_id ORDER BY placed_at, id)) AS days_since_last
FROM orders
ORDER BY customer_id ASC, order_date ASC;
```
