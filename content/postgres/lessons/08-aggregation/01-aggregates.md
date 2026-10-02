---
id: aggregates
title: "COUNT, SUM and AVG"
chapter: Aggregation
order: 1
dataset: food
check: rows-unordered
---

Aggregate functions collapse many rows into one summary value:
- `count(*)` counts the rows.
- `sum(column)` adds up the numeric values.
- `avg(column)` computes the average value.
- `round(value, 2)` rounds a number to two decimal places — handy because averages often have long decimals.

```sql
SELECT count(*) AS total_items, round(avg(price), 2) AS average_price
FROM menu_items;
```

## Context

Aggregates only see the rows that survive the `WHERE` filter. This counts just the riders who use a bike:

```sql
SELECT count(*) AS bike_riders
FROM riders
WHERE vehicle = 'bike';
```

## Task

Summarise the completed deliveries in `orders` (rows whose `status` is `'delivered'`). Return one row with:
1. the number of such orders, aliased as `order_count`
2. the sum of their `total`, aliased as `total_revenue`
3. their average `total` rounded to 2 decimal places, aliased as `avg_order_value`

## Hint

- Filter the rows first, then all three aggregates work on the same delivered orders.
- Wrap the average in `round(..., 2)`.

## Solution

```sql
SELECT count(*) AS order_count, sum(total) AS total_revenue, round(avg(total), 2) AS avg_order_value
FROM orders
WHERE status = 'delivered';
```
