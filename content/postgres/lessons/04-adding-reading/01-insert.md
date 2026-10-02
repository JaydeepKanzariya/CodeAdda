---
id: insert
title: INSERT
chapter: Adding and reading data
order: 1
check: state
checkQuery: SELECT id, name, price, is_veg FROM menu ORDER BY id;
---

To add new rows to a table, use the `INSERT INTO` statement. It is good practice to list the column names after the table name, then write `VALUES` and the row's values in parentheses, in the same order as the columns.

```sql
INSERT INTO menu (name, id, price, is_veg)
VALUES ('Masala Dosa', 4, 90.00, true);
```

Because the columns are named, the values only have to match your list, not the order the table was created in. Your statement also keeps working if columns are added to the table later.

## Context

You can insert several rows at once by separating the parenthesised value lists with commas:

```sql
INSERT INTO menu (id, name, price, is_veg) VALUES
  (10, 'Lassi', 70.00, true),
  (11, 'Gulab Jamun', 50.00, true);
```

## Task

Insert a new dish into the `menu` table with:
- `id`: `3`
- `name`: `'Butter Chicken'`
- `price`: `320.00`
- `is_veg`: `false`

List the columns `(id, name, price, is_veg)` explicitly in your statement.

## Hint

- Name the four columns in parentheses after the table name, then give the values in the same order after `VALUES`.
- Text values need single quotes; numbers and `false` do not.

## Solution

```sql
INSERT INTO menu (id, name, price, is_veg) VALUES (3, 'Butter Chicken', 320.00, false);
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
  (1, 'Paneer Tikka', 240.00, true),
  (2, 'Garlic Naan', 60.00, true);
```
