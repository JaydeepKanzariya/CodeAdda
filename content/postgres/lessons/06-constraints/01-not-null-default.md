---
id: not-null-default
title: NOT NULL and DEFAULT
chapter: Constraints
order: 1
check: state
checkQuery: SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'dishes' ORDER BY column_name;
---

Column constraints stop bad data at the table itself.
- `NOT NULL` means the column can never hold `NULL`. Any insert or update that tries to store `NULL` there is rejected with an error.
- `DEFAULT <value>` fills in a value automatically when a new row is inserted without that column.

```sql
CREATE TABLE users (
  id integer,
  username text NOT NULL,
  active boolean DEFAULT true
);
```

## Context

You can look up a column's nullability and default in `information_schema.columns`:

```sql
CREATE TABLE sample (id int, flag boolean DEFAULT false);
SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'sample';
```

## Task

Create a table named `dishes` with three columns:
- `id` of type `integer`
- `name` of type `text` that can never be `NULL`
- `available` of type `boolean` that is `true` when no value is given

## Hint

- Constraints are written inside the column definition, right after the column's type.
- The fallback value comes after the `DEFAULT` keyword.

## Solution

```sql
CREATE TABLE dishes (
  id integer,
  name text NOT NULL,
  available boolean DEFAULT true
);
```

## Setup

```sql
CREATE TABLE _start (n int);
DROP TABLE _start;
```
