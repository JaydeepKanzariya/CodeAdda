---
id: filter
title: Conditional totals with FILTER
chapter: Aggregation
order: 3
dataset: food
check: rows-unordered
---

Sometimes you want several conditional counts side by side — for example, how many orders were cancelled and how many were delivered. Without `FILTER` you would write `sum(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)`. `FILTER` (part of the SQL standard, supported by PostgreSQL) says the same thing more plainly: `count(*) FILTER (WHERE status = 'cancelled')`.

Each aggregate gets its own condition, so you can compute several of them in a single pass over the table:

```sql
SELECT
  count(*) FILTER (WHERE price < 100) AS cheap_dishes,
  count(*) FILTER (WHERE price >= 100) AS premium_dishes
FROM menu_items;
```

## Watch it happen
```yaml
tables:
  orders:
    label: "orders of Tokyo Ramen (restaurant 3)"
    columns: [id, restaurant_id, status]
    rows:
      - [4, 3, cancelled]
      - [11, 3, delivered]
      - [19, 3, delivered]
      - [26, 3, delivered]
      - [34, 3, cancelled]
  result:
    label: result
    columns: [restaurant_name, delivered_orders, cancelled_orders]
    rows:
      - [Tokyo Ramen, 3, 2]
steps:
  - label: One group
    caption: "Tokyo Ramen has five orders, a mix of delivered and cancelled ones. They all fall into the same group."
    show: [orders]
  - label: First FILTER
    caption: "count(*) FILTER (WHERE status = 'delivered') counts only orders 11, 19 and 26."
    show: [orders]
    highlight: [{ table: orders, row: 2, tone: kept }, { table: orders, row: 3, tone: kept }, { table: orders, row: 4, tone: kept }]
    notes:
      - { title: "3 delivered", text: "Orders 11, 19 and 26 match the condition", tone: kept }
  - label: Second FILTER
    caption: "In the same query, count(*) FILTER (WHERE status = 'cancelled') counts orders 4 and 34."
    show: [orders]
    highlight: [{ table: orders, row: 1, tone: focus }, { table: orders, row: 5, tone: focus }]
    notes:
      - { title: "2 cancelled", text: "Orders 4 and 34 match the condition", tone: focus }
  - label: Result row
    caption: "The group becomes one result row holding both counts."
    show: [result]
    highlight: [{ table: result, row: 1, tone: kept }]
```

## Context

`FILTER` works with any aggregate, including `sum` and `avg`:

```sql
SELECT
  sum(total) FILTER (WHERE status = 'delivered') AS delivered_revenue,
  sum(total) FILTER (WHERE status = 'cancelled') AS lost_revenue
FROM orders;
```

## Task

Join `restaurants` and `orders` and return one row per restaurant with:
- the restaurant name, aliased as `restaurant_name`
- the number of its delivered orders, aliased as `delivered_orders`
- the number of its cancelled orders, aliased as `cancelled_orders`

Use `FILTER` for the two counts.

## Hint

- Group by the restaurant name, as in the previous lesson.
- Write two counts that differ only in their `FILTER` condition on the order's status.

## Solution

```sql
SELECT
  r.name AS restaurant_name,
  count(*) FILTER (WHERE o.status = 'delivered') AS delivered_orders,
  count(*) FILTER (WHERE o.status = 'cancelled') AS cancelled_orders
FROM restaurants r
JOIN orders o ON r.id = o.restaurant_id
GROUP BY r.name;
```
