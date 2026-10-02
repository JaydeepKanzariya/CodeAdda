---
id: create-view
title: CREATE VIEW
chapter: Views
order: 1
dataset: food
check: state
checkQuery: SELECT v.name, v.orders, (SELECT count(*) FROM information_schema.views WHERE table_name = 'restaurant_orders') AS is_view FROM restaurant_orders v ORDER BY 1;
---

A view is a saved query with a name. You can select from it just like a table, but it stores no rows of its own: every time you query the view, PostgreSQL runs the underlying query again, so the view always shows current data.

Views let you give a complex join or filter a short, reusable name:

```sql
CREATE VIEW scooter_riders AS
SELECT id, name, joined_on
FROM riders
WHERE vehicle = 'scooter';
```

## Context

Once created, a view is queried with an ordinary `SELECT`:

```sql
CREATE VIEW delhi_restaurants AS
SELECT id, name FROM restaurants WHERE city = 'Delhi';

SELECT * FROM delhi_restaurants;
```

## Task

Create a view named `restaurant_orders` with two columns:
- `name`: the restaurant's name
- `orders`: how many orders that restaurant has received

The view should have one row per restaurant that has orders.

## Hint

- The view's body is a normal `SELECT` that joins restaurants to their orders and groups per restaurant.
- Name the count column with `AS` so the view's column is called `orders`.

## Solution

```sql
CREATE VIEW restaurant_orders AS
SELECT r.name, count(o.id) AS orders
FROM restaurants r
JOIN orders o ON r.id = o.restaurant_id
GROUP BY r.name;
```
