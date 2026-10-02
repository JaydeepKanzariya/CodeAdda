---
id: lag-lead
title: LAG and LEAD
chapter: Window functions
order: 3
dataset: food
check: rows-ordered
---

Comparing a row with the one before or after it is common when you look at events over time. PostgreSQL has two window functions for this:
- `LAG(column, offset)` reads a value from an earlier row in the window (the default offset is 1, the row just before).
- `LEAD(column, offset)` reads a value from a later row.

When there is no earlier or later row, for example on the very first row, they return `NULL`.

```sql
SELECT id, placed_at,
  lead(placed_at) OVER (ORDER BY placed_at) AS next_time
FROM orders;
```

## Context

Subtracting the previous timestamp from the current one gives the time between consecutive orders. Customer 2 waited about 8 days between orders:

```sql
SELECT id, placed_at,
  placed_at - lag(placed_at) OVER (ORDER BY placed_at) AS gap
FROM orders
WHERE customer_id = 2
ORDER BY placed_at;
```

## Task

For customer 1 (`customer_id = 1`), return each order's `id`, `placed_at` and the `placed_at` of that customer's previous order, aliased as `prev_placed_at`. Sort the window and the result by `placed_at`, then `id`, ascending.

## Hint

- `LAG` looks one row back; give it `OVER (...)` with the same sort order as the result.

## Solution

```sql
SELECT
  id,
  placed_at,
  lag(placed_at) OVER (ORDER BY placed_at, id) AS prev_placed_at
FROM orders
WHERE customer_id = 1
ORDER BY placed_at, id;
```
