---
id: alter-table
title: Changing a table
chapter: Creating tables
order: 2
check: state
checkQuery: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'menu' ORDER BY column_name;
---

As an app grows, its tables need to change without losing the data already in them. The `ALTER TABLE` statement changes an existing table's definition.

To add a new column, use the `ADD COLUMN` clause with the column's name and type:
```sql
CREATE TABLE riders (id integer, name text);
ALTER TABLE riders ADD COLUMN vehicle text;
```

## Context

Existing rows get `NULL` in a new column unless you give it a `DEFAULT`:

```sql
CREATE TABLE drinks (name text);
INSERT INTO drinks (name) VALUES ('Lassi');
ALTER TABLE drinks ADD COLUMN size_ml integer DEFAULT 250;
SELECT name, size_ml FROM drinks;
```

## Task

Change the existing `menu` table by adding a new column named `is_veg` of type `boolean`.

## Hint

- Changing a table that already exists starts with `ALTER TABLE` and the table's name.
- The clause that adds a column takes the new column's name, then its type.

## Solution

```sql
ALTER TABLE menu ADD COLUMN is_veg boolean;
```

## Setup

```sql
CREATE TABLE menu (
  id integer,
  name text,
  price numeric(6,2)
);
```
