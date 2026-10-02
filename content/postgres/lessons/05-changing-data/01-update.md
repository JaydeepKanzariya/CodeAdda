---
id: update
title: UPDATE
chapter: Changing data
order: 1
check: state
checkQuery: SELECT id, name, price, is_veg FROM menu ORDER BY id;
---

The `UPDATE` statement changes rows that already exist. Its `SET` clause says which column gets which new value, and its `WHERE` clause picks the rows to change.

```sql
UPDATE menu
SET price = 150.00
WHERE id = 5;
```

Be careful with `WHERE`: if you leave it out, every row in the table is updated.

## Context

You can change several columns at once by separating the assignments with commas:

```sql
UPDATE menu
SET price = 200.00, name = 'Dal Fry'
WHERE id = 4;
```

## Task

Write an `UPDATE` statement that sets the `price` of `'Garlic Naan'` to `75.00` in the `menu` table.

## Hint

- `SET` takes the column and its new value.
- Pick the row by its name in `WHERE`, or every price changes.

## Solution

```sql
UPDATE menu SET price = 75.00 WHERE name = 'Garlic Naan';
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
