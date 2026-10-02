---
id: busiest-day
title: Busiest Day
chapter: Everyday Postgres
order: 1
difficulty: Medium
check: rows-ordered
---

Management wants to pinpoint peak order traffic days to schedule support staff.

## Tables
```text
Table: Orders

+-------------+-----------+
| Column Name | Type      |
+-------------+-----------+
| id          | int       |
| placed_at   | timestamp |
| total       | numeric   |
+-------------+-----------+
```
id is the primary key for this table.
placed_at is the exact timestamp when the order was placed.

## Task
Write a query to find the single day with the most orders. Return `order_day` (the calendar date, as a `date`) and `order_count` (the number of orders placed that day).
If two days tie, pick the earlier one. Return only that one row.

## Example
```text
Input:
Orders table:
+----+---------------------+--------+
| id | placed_at           | total  |
+----+---------------------+--------+
| 1  | 2026-03-02 12:00:00 | 300.00 |
| 2  | 2026-03-02 14:00:00 | 450.00 |
| 3  | 2026-03-03 11:00:00 | 200.00 |
| 4  | 2026-03-04 18:00:00 | 500.00 |
| 5  | 2026-03-04 20:00:00 | 600.00 |
| 6  | 2026-03-04 21:00:00 | 250.00 |
+----+---------------------+--------+

Output:
+------------+-------------+
| order_day  | order_count |
+------------+-------------+
| 2026-03-04 | 3           |
+------------+-------------+

Explanation: March 4th had 3 orders, more than March 2nd (2) and March 3rd (1).
```

## Hint
- Turn each timestamp into its day first, then group by that day. `date_trunc` or a cast to `date` both drop the time.
- Sort so the biggest count comes first and keep just one row.

## Setup
```sql
CREATE TABLE orders (id INTEGER PRIMARY KEY, placed_at TIMESTAMP NOT NULL, total NUMERIC(6,2) NOT NULL);
COMMENT ON TABLE orders IS 'Challenge table: orders';
INSERT INTO orders VALUES
  (1, '2026-03-02 12:00:00', 300.00),
  (2, '2026-03-02 14:00:00', 450.00),
  (3, '2026-03-03 11:00:00', 200.00),
  (4, '2026-03-04 18:00:00', 500.00),
  (5, '2026-03-04 20:00:00', 600.00),
  (6, '2026-03-04 21:00:00', 250.00);
```

## Solution
```sql
SELECT
  date_trunc('day', placed_at)::date AS order_day,
  count(*) AS order_count
FROM orders
GROUP BY date_trunc('day', placed_at)::date
ORDER BY order_count DESC, order_day ASC
LIMIT 1;
```
