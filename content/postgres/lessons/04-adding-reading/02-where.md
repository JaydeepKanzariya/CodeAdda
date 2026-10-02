---
id: where
title: Filtering with WHERE
chapter: Adding and reading data
order: 2
check: rows-unordered
---

The `WHERE` clause filters rows before they are returned. Only rows where the condition is `true` make it into the result.

You can combine conditions with `AND`, `OR` and `NOT`. For a boolean column you can simply write `WHERE is_veg` instead of `WHERE is_veg = true`.

```sql
SELECT name, price FROM menu WHERE price > 300 AND NOT is_veg;
```

## Context

The comparison operators are `=`, `<>` (not equal), `<`, `>`, `<=` and `>=`:

```sql
SELECT name FROM menu WHERE price = 60.00;
```

## Task

Return the `name` and `price` from `menu` for every vegetarian dish (`is_veg` is true) that costs less than `200`.

## Hint

- Both conditions must be true at the same time, so join them with a logical operator.
- A boolean column can be a condition on its own.

## Solution

```sql
SELECT name, price FROM menu WHERE is_veg AND price < 200;
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
