---
id: delete
title: DELETE
chapter: Changing data
order: 2
check: state
checkQuery: SELECT id, name, price, is_veg, available FROM menu ORDER BY id;
---

The `DELETE FROM` statement removes rows from a table. Just like `UPDATE`, a `WHERE` condition says which rows to remove.

```sql
DELETE FROM menu
WHERE id = 5;
```

Without a `WHERE` clause, `DELETE FROM table;` removes every row in the table.

## Context

The condition can be any comparison, not just an id:

```sql
DELETE FROM menu
WHERE price < 100.00;
```

## Task

Remove every dish from the `menu` table that is currently unavailable (`available` is false).

## Hint

- `DELETE FROM` removes every row the `WHERE` condition is true for, so the condition must be true only for unavailable dishes.
- `available` is a boolean, and a boolean can be flipped with a logical operator.

## Solution

```sql
DELETE FROM menu WHERE NOT available;
```

## Setup

```sql
CREATE TABLE menu (
  id integer,
  name text,
  price numeric(6,2),
  is_veg boolean,
  available boolean
);

INSERT INTO menu (id, name, price, is_veg, available) VALUES
  (1, 'Paneer Butter Masala', 260.00, true, true),
  (2, 'Garlic Naan', 60.00, true, true),
  (3, 'Chicken Tikka', 290.00, false, false),
  (4, 'Dal Tadka', 180.00, true, true),
  (5, 'Jeera Rice', 140.00, true, false);
```
