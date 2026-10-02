---
id: date-trunc
title: date_trunc and intervals
chapter: Dates and generate_series
order: 1
dataset: food
check: rows-unordered
---

Reports usually count things per day, week or month. `date_trunc('unit', value)` cuts a timestamp down to the start of its unit — `'day'`, `'week'`, `'month'`, `'year'` and so on — so every timestamp in the same period gets the same value and can be grouped together:

```sql
SELECT date_trunc('day', placed_at) AS order_day, count(*) AS orders_count
FROM orders
GROUP BY date_trunc('day', placed_at)
ORDER BY order_day;
```

With `'week'`, PostgreSQL weeks start on **Monday** at midnight. The orders in this dataset run from Monday 2026-03-02 to Sunday 2026-03-22, so they fall into three weekly buckets: 2026-03-02, 2026-03-09 and 2026-03-16.

`date_trunc` returns a timestamp. When you only want the date, cast the result with `::date`.

You can also do arithmetic with an `interval`, such as `+ interval '30 minutes'` or `- interval '7 days'`. This shows when each of the first three orders should be delivered if delivery takes 30 minutes:

```sql
SELECT id, placed_at, placed_at + interval '30 minutes' AS deliver_by
FROM orders
WHERE id <= 3;
```

## Context

Truncating to `'month'` turns many different join dates into one bucket per month:

```sql
SELECT date_trunc('month', joined_on)::date AS join_month, count(*) AS new_customers
FROM customers
GROUP BY date_trunc('month', joined_on)::date
ORDER BY join_month;
```

## Task

Count the orders per week. Return the start of each week (based on `placed_at`) as a `date`, aliased as `order_week`, and the number of orders in that week aliased as `order_count`.

## Hint

- Truncate `placed_at` to the week, cast it to a date, and select that as the bucket.
- Group by the same expression you select.

## Solution

```sql
SELECT date_trunc('week', placed_at)::date AS order_week, count(*) AS order_count
FROM orders
GROUP BY date_trunc('week', placed_at)::date;
```
