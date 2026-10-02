---
id: inner-join
title: Inner join
chapter: Joins and relationships
order: 1
dataset: food
check: rows-unordered
---

In a relational database, related facts live in separate tables. An `INNER JOIN` (or simply `JOIN`) combines rows from two tables wherever the condition in the `ON` clause is true — usually a foreign key matching a primary key.

Rows that find no partner on the other side are left out of the result.

```sql
SELECT c.name, o.id AS order_id
FROM customers c
JOIN orders o ON c.id = o.customer_id;
```

## Context

Table aliases (like `o` for `orders` and `r` for `restaurants`) keep queries short, and you can still filter the joined rows with `WHERE`:

```sql
SELECT o.id, o.status, r.cuisine
FROM orders o
JOIN restaurants r ON o.restaurant_id = r.id
WHERE r.city = 'Delhi'
LIMIT 5;
```

## Task

Join `orders` with `restaurants` so that each order is matched to the restaurant it was placed with. Return the order's `id` and the restaurant's name aliased as `restaurant_name`.

## Hint

- The link between the two tables is the restaurant's id stored on each order.
- Give the restaurant's name column a new label with `AS`.

## Solution

```sql
SELECT o.id, r.name AS restaurant_name
FROM orders o
JOIN restaurants r ON o.restaurant_id = r.id;
```
