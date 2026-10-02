---
id: create-table
title: CREATE TABLE
chapter: Creating tables
order: 1
check: state
checkQuery: SELECT column_name, data_type, numeric_precision, numeric_scale FROM information_schema.columns WHERE table_name = 'menu' ORDER BY column_name;
---

A database keeps its data in tables made of rows and columns. The `CREATE TABLE` command makes a new, empty table.

Inside the parentheses you list each column: its name, then its data type, with commas between the columns:
```sql
CREATE TABLE riders (
  id integer,
  name text,
  joined_on date
);
```

## Context

You can check which columns a table has by querying the `information_schema.columns` view:

```sql
CREATE TABLE preview (code text);
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'preview';
```

## Task

Create a table named `menu` with three columns:
- `id` of type `integer`
- `name` of type `text`
- `price` of type `numeric(6,2)`

## Hint

- Give the table name, then the column list in parentheses: each column's name followed by its type.
- For `price`, the precision and scale go in parentheses right after `numeric`.

## Solution

```sql
CREATE TABLE menu (
  id integer,
  name text,
  price numeric(6,2)
);
```

## Setup

```sql
CREATE TABLE _start (n int);
DROP TABLE _start;
```
