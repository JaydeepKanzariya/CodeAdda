---
id: order-limit
title: Sorting and limiting
chapter: Adding and reading data
order: 3
check: rows-ordered
---

A database does not promise any particular order for the rows it returns. To sort them, add an `ORDER BY` clause with the column to sort by. Add `DESC` for descending order (highest first) or `ASC` (the default) for ascending order.

To return only some of the rows, add `LIMIT count` at the end. For example, `LIMIT 2` keeps only the first 2 rows of the sorted result.

```sql
SELECT name, price FROM menu ORDER BY price ASC LIMIT 2;
```

## Context

You can filter, sort and limit in the same query:

```sql
SELECT name, price FROM menu WHERE is_veg ORDER BY price DESC LIMIT 2;
```

## Task

Return `name` and `price` from `menu` for the 3 most expensive dishes, sorted by `price` from highest to lowest.

## Hint

- Sort so the biggest price comes first.
- Then keep only the first few rows.

## Solution

```sql
SELECT name, price FROM menu ORDER BY price DESC LIMIT 3;
```

## Setup

```sql
CREATE TABLE menu (
  id integer,
  name text,
  price numeric(6,2),
  is_veg boolean
);

INSERT INTO menu (id, name, price, is_veg) VALUES
  (1, 'Paneer Butter Masala', 260.00, true),
  (2, 'Garlic Naan', 60.00, true),
  (3, 'Chicken Tikka', 290.00, false),
  (4, 'Dal Tadka', 180.00, true),
  (5, 'Jeera Rice', 140.00, true),
  (6, 'Mutton Biryani', 380.00, false),
  (7, 'Aloo Gobi', 160.00, true),
  (8, 'Fish Curry', 340.00, false);
```
