---
id: fill-gaps
title: Filling gaps in daily totals
chapter: Dates and generate_series
order: 3
dataset: food
check: rows-ordered
---

When you group orders by `placed_at::date`, a day with no orders produces no group at all — it simply disappears from the result. A chart built from that result would skip the day instead of showing a zero.

The fix is to start from a complete calendar ("spine") built with `generate_series`, then `LEFT JOIN` the orders onto it. Every day is kept; days without orders get `NULL` order columns. Counting a column of the orders table, such as `count(o.id)`, ignores those `NULL`s, so empty days count as `0`. (`count(*)` would count the spine row and give 1.)

## Watch it happen
```yaml
tables:
  calendar:
    label: calendar spine
    columns: [day]
    rows:
      - ["2026-03-08"]
      - ["2026-03-09"]
      - ["2026-03-10"]
  actual_orders:
    label: orders placed
    columns: [id, day]
    rows:
      - [13, "2026-03-08"]
      - [14, "2026-03-08"]
      - [15, "2026-03-10"]
      - [16, "2026-03-10"]
  result:
    label: result
    columns: [day, order_count]
    rows:
      - ["2026-03-08", 2]
      - ["2026-03-09", 0]
      - ["2026-03-10", 2]
steps:
  - label: The gap
    caption: "No orders were placed on 2026-03-09. Grouping the orders table alone would skip that day completely."
    show: [actual_orders]
  - label: Calendar spine
    caption: "generate_series produces every calendar day, including 2026-03-09."
    show: [calendar, actual_orders]
    highlight: [{ table: calendar, row: 2, tone: focus }]
  - label: LEFT JOIN and count
    caption: "The LEFT JOIN keeps 2026-03-09 with a NULL order id, so count(o.id) gives 0 for it and 2 for its neighbours."
    show: [result]
    highlight: [{ table: result, row: 2, tone: kept }]
    notes:
      - { title: "No missing days", text: "count(o.id) returns 0 for days with no orders", tone: kept }
```

## Context

With `sum`, an empty day gives `NULL` rather than `0`; wrap it in `COALESCE` to report 0. This adds up the revenue for 15–18 March, a range that includes the empty day 2026-03-16:

```sql
SELECT
  s.day::date AS day,
  COALESCE(sum(o.total), 0) AS revenue
FROM generate_series('2026-03-15'::date, '2026-03-18'::date, '1 day'::interval) s(day)
LEFT JOIN orders o ON o.placed_at::date = s.day::date
GROUP BY s.day::date
ORDER BY day;
```

## Task

Return one row for every day from 2026-03-02 to 2026-03-22 inclusive, with the day (as a `date`) in a column named `day` and the number of orders placed that day in a column named `order_count`. Days without orders must show `0`. Order the rows by `day`, earliest first.

## Hint

- Put `generate_series` in the `FROM` clause and give it a table alias and column name, then join the orders onto it.
- Compare dates with dates on both sides of the join condition, and count a column from `orders`, not `*`.

## Solution

```sql
SELECT
  s.day::date AS day,
  count(o.id) AS order_count
FROM generate_series('2026-03-02'::date, '2026-03-22'::date, '1 day'::interval) s(day)
LEFT JOIN orders o ON o.placed_at::date = s.day::date
GROUP BY s.day::date
ORDER BY day;
```
