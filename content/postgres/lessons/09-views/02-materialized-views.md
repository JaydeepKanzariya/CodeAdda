---
id: materialized-views
title: Materialized views and REFRESH
chapter: Views
order: 2
dataset: food
check: state
checkQuery: SELECT d.day, d.orders, (SELECT count(*) FROM pg_matviews WHERE matviewname = 'daily_orders') AS is_matview FROM daily_orders d ORDER BY 1;
---

Unlike a regular view, a **materialized view** runs its query once and stores the resulting rows. Reading it is then as fast as reading a table, which helps when the query is expensive.

The catch: because the rows are a stored snapshot, later changes to the underlying tables do not show up automatically. You update the snapshot yourself with `REFRESH MATERIALIZED VIEW view_name;`.

```sql
CREATE MATERIALIZED VIEW city_summary AS
SELECT city, count(*) AS restaurants FROM restaurants GROUP BY city;

REFRESH MATERIALIZED VIEW city_summary;
```

## Context

Materialized views suit dashboards and reports, where reads are frequent and slightly stale numbers are acceptable:

```sql
CREATE MATERIALIZED VIEW rider_stats AS
SELECT vehicle, count(*) AS riders FROM riders GROUP BY vehicle;

SELECT * FROM rider_stats;
```

## Task

Run these three steps, in this order:
1. Create a materialized view named `daily_orders` with one row per calendar day of `placed_at` from `orders`: the day as `day` (a `date`) and the number of orders that day as `orders`.
2. Insert a new order with `customer_id` 1, `restaurant_id` 1, `rider_id` 1, `status` `'placed'`, `placed_at` `'2026-03-25 12:00:00'`, `total` 250.00 and `details` `'{"payment":{"method":"upi"}}'`.
3. Refresh `daily_orders` so it includes the new order.

Because a materialized view stores a snapshot taken when it was created, the new order only shows up in `daily_orders` after the refresh.

## Hint

- Casting a timestamp with `::date` drops the time of day; group by that same expression.
- An `INSERT` alone does not change a materialized view — only a refresh does.

## Solution

```sql
CREATE MATERIALIZED VIEW daily_orders AS
SELECT placed_at::date AS day, count(*) AS orders
FROM orders
GROUP BY placed_at::date;

INSERT INTO orders (customer_id, restaurant_id, rider_id, status, placed_at, total, details)
VALUES (1, 1, 1, 'placed', '2026-03-25 12:00:00', 250.00, '{"payment":{"method":"upi"}}');

REFRESH MATERIALIZED VIEW daily_orders;
```
