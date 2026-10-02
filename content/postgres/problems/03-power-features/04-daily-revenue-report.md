---
id: daily-revenue-report
title: Daily Revenue Report
chapter: Power features
order: 4
difficulty: Hard
check: rows-ordered
---

The finance dashboard requires a gap-free daily revenue report that shows every day in the range, even if no orders were placed on that day.

## Tables
```text
Table: Orders

+-------------+-----------+
| Column Name | Type      |
+-------------+-----------+
| id          | int       |
| placed_at   | timestamp |
| total       | numeric   |
| status      | text      |
+-------------+-----------+
```
id is the primary key for this table.
placed_at is the exact timestamp when the order was placed.
status is 'delivered', 'cancelled', or 'placed'.

## Task
Write a query that returns one row for every day from 2026-03-01 to 2026-03-07 inclusive, with:
- `day`: the date
- `revenue`: the sum of `total` for that day's delivered orders, or `0` if there were none

Every day in the range must appear, even days with no orders. Order the result by `day` ascending.

## Example
```text
Input:
Orders table:
+----+---------------------+--------+-----------+
| id | placed_at           | total  | status    |
+----+---------------------+--------+-----------+
| 1  | 2026-03-01 12:00:00 | 400.00 | delivered |
| 2  | 2026-03-01 18:00:00 | 300.00 | delivered |
| 3  | 2026-03-03 14:00:00 | 500.00 | delivered |
| 4  | 2026-03-03 20:00:00 | 250.00 | cancelled |
| 5  | 2026-03-05 10:00:00 | 600.00 | delivered |
+----+---------------------+--------+-----------+

Output:
+------------+---------+
| day        | revenue |
+------------+---------+
| 2026-03-01 | 700.00  |
| 2026-03-02 | 0       |
| 2026-03-03 | 500.00  |
| 2026-03-04 | 0       |
| 2026-03-05 | 600.00  |
| 2026-03-06 | 0       |
| 2026-03-07 | 0       |
+------------+---------+

Explanation: March 1st adds up to 400.00 + 300.00 = 700.00. The cancelled order on March 3rd is left out, and days with no delivered orders show 0.
```

## Hint
- Build the list of days first, then attach orders to it. `generate_series` can produce dates.
- Filtering status in `WHERE` would drop the empty days. Put that condition somewhere it cannot remove a day.
- A sum over no rows is `NULL`, not `0`.

## Setup
```sql
CREATE TABLE orders (id INTEGER PRIMARY KEY, placed_at TIMESTAMP NOT NULL, total NUMERIC(6,2) NOT NULL, status TEXT NOT NULL);
COMMENT ON TABLE orders IS 'Challenge table: orders';
INSERT INTO orders VALUES
  (1, '2026-03-01 12:00:00', 400.00, 'delivered'),
  (2, '2026-03-01 18:00:00', 300.00, 'delivered'),
  (3, '2026-03-03 14:00:00', 500.00, 'delivered'),
  (4, '2026-03-03 20:00:00', 250.00, 'cancelled'),
  (5, '2026-03-05 10:00:00', 600.00, 'delivered');
```

## Solution
```sql
SELECT
  s.day::date AS day,
  COALESCE(sum(o.total), 0) AS revenue
FROM generate_series('2026-03-01'::date, '2026-03-07'::date, '1 day'::interval) s(day)
LEFT JOIN orders o ON o.placed_at::date = s.day::date AND o.status = 'delivered'
GROUP BY s.day::date
ORDER BY day;
```
