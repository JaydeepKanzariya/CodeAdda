---
id: many-to-many
title: Many-to-many through a join table
chapter: Joins and relationships
order: 3
dataset: food
check: rows-unordered
---

In a food delivery app, an order can contain several dishes, and a dish can appear in many orders. This is a **many-to-many** relationship. Neither table can hold a single foreign key to the other, so a third table in the middle — a junction (or bridge) table, here `order_items` — stores one row per (order, dish) pair, plus the quantity.

To get from an order to its dishes you join twice, through the bridge:

```text
orders -> order_items -> menu_items
```

## Watch it happen
```yaml
tables:
  orders:
    label: "orders (id 1)"
    columns: [id, customer_id, total]
    rows:
      - [1, 1, "400.00"]
  bridge:
    label: order_items
    columns: [order_id, menu_item_id, quantity]
    rows:
      - [1, 1, 1]
      - [1, 3, 1]
      - [2, 5, 1]
  dishes:
    label: menu_items
    columns: [id, name, price]
    rows:
      - [1, Butter Chicken, "340.00"]
      - [3, Garlic Naan, "60.00"]
      - [5, Margherita Pizza, "290.00"]
steps:
  - label: The order
    caption: "Customer 1 placed order 1 for 400.00. The orders table does not store which dishes were in it."
    show: [orders]
  - label: Join the bridge table
    caption: "order_items has two rows with order_id 1, pointing at menu items 1 and 3. The row for order 2 does not match."
    show: [orders, bridge]
    highlight: [{ table: bridge, row: 1, tone: kept }, { table: bridge, row: 2, tone: kept }, { table: bridge, row: 3, tone: removed }]
  - label: Resolve the dishes
    caption: "Joining menu_items turns menu_item_id 1 into Butter Chicken (340.00) and 3 into Garlic Naan (60.00) — 400.00 in total."
    show: [orders, bridge, dishes]
    highlight: [{ table: dishes, row: 1, tone: kept }, { table: dishes, row: 2, tone: kept }]
    notes:
      - { title: "2 dishes found", text: "Butter Chicken (qty 1) and Garlic Naan (qty 1)", tone: kept }
```

## Context

Joining three tables lets you report on order contents. This counts how many different dishes each order has:

```sql
SELECT o.id, c.name AS customer, count(*) AS item_count
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, c.name
ORDER BY o.id
LIMIT 5;
```

## Task

Connect `orders`, `order_items` and `menu_items` to list what was in order 1. Return the dish's name aliased as `dish_name` and the `quantity` from `order_items`.

## Hint

- You need two joins: one from the order to the bridge table, and one from the bridge table to the dish.
- Filter on the order's id; the quantity lives in the bridge table, the name in `menu_items`.

## Solution

```sql
SELECT m.name AS dish_name, oi.quantity
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN menu_items m ON oi.menu_item_id = m.id
WHERE o.id = 1;
```
