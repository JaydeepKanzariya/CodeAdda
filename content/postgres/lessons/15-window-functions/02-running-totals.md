---
id: running-totals
title: Running totals
chapter: Window functions
order: 2
dataset: food
check: rows-ordered
---

When an aggregate such as `sum()` gets an `OVER (ORDER BY ...)` clause, PostgreSQL computes a **running total**: for each row, the sum of every row from the first one up to the current one.

By default the frame includes every row that ties with the current one on the `ORDER BY` value; adding `id` to the `ORDER BY` gives each row its own place, so the total grows one row at a time.

```sql
SELECT id, placed_at, total,
  sum(total) OVER (ORDER BY placed_at) AS cumulative_revenue
FROM orders;
```

## Watch it happen
```yaml
tables:
  orders_run:
    label: first three delivered orders
    columns: [id, placed_at, total]
    rows:
      - [1, 2026-03-02 12:15:00, 400.00]
      - [2, 2026-03-02 19:30:00, 480.00]
      - [3, 2026-03-03 13:00:00, 620.00]
  accumulated:
    label: running total result
    columns: [id, total, running_total]
    rows:
      - [1, 400.00, 400.00]
      - [2, 480.00, 880.00]
      - [3, 620.00, 1500.00]
steps:
  - label: First order
    caption: "The first order starts the running total at 400.00."
    show: [orders_run, accumulated]
    highlight: [{ table: accumulated, cell: [1, running_total], tone: kept }]
  - label: Second order
    caption: "The second order adds 480.00, so the running total becomes 880.00."
    show: [orders_run, accumulated]
    highlight: [{ table: accumulated, cell: [2, running_total], tone: kept }]
    notes:
      - { title: "Accumulated", text: "400 + 480 = 880", tone: kept }
  - label: Third order
    caption: "The third order adds 620.00 to reach 1500.00."
    show: [orders_run, accumulated]
    highlight: [{ table: accumulated, cell: [3, running_total], tone: kept }]
    notes:
      - { title: "Running sum", text: "880 + 620 = 1500", tone: kept }
```

## Context

Add `PARTITION BY` and the running total restarts for each group. Here each customer gets their own running spend:

```sql
SELECT id, customer_id, total,
  sum(total) OVER (PARTITION BY customer_id ORDER BY placed_at) AS customer_spent
FROM orders
LIMIT 5;
```

## Task

For delivered orders only (`status = 'delivered'`), return `id`, `placed_at`, `total` and a running total of `total` aliased as `running_total`. The running total must follow `placed_at`, using `id` to break ties. Order the result by `placed_at`, then `id`, ascending.

## Hint

- Filter first with `WHERE`; the window only sees the rows that are left.
- Sum inside `OVER (...)`, sorted the same way as the final result.

## Solution

```sql
SELECT
  id,
  placed_at,
  total,
  sum(total) OVER (ORDER BY placed_at, id) AS running_total
FROM orders
WHERE status = 'delivered'
ORDER BY placed_at, id;
```
