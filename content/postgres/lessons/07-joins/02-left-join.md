---
id: left-join
title: Left join
chapter: Joins and relationships
order: 2
dataset: food
check: rows-unordered
---

A `LEFT JOIN` (or `LEFT OUTER JOIN`) keeps every row from the left table, even when no row in the right table matches. For those rows, the columns that would have come from the right table are filled with `NULL`.

This is what you need for optional relationships — such as orders that no delivery rider has picked up yet. An inner join would silently drop those orders; a left join keeps them with a `NULL` rider:

```sql
SELECT o.id, o.status, r.name AS rider
FROM orders o
LEFT JOIN riders r ON o.rider_id = r.id
WHERE o.id >= 38;
```

Orders 39 and 40 are still waiting for a rider, so they come back with `rider` set to `NULL`.

## Context

To find the left rows that have no match at all, keep only the rows where a column of the right table came back `NULL` — for example `WHERE r.id IS NULL`. This lists every order that has no rider:

```sql
SELECT o.id, o.status
FROM orders o
LEFT JOIN riders r ON o.rider_id = r.id
WHERE r.id IS NULL;
```

## Task

Write a `LEFT JOIN` from `orders` to `riders` so every order appears, together with the rider who delivered it (if any). Return the order `id` and the rider's name aliased as `rider_name`.

## Hint

- `orders` must be the left table, so it comes right after `FROM`.
- Orders without a rider should still appear, with an empty `rider_name`.

## Solution

```sql
SELECT o.id, r.name AS rider_name
FROM orders o
LEFT JOIN riders r ON o.rider_id = r.id;
```
