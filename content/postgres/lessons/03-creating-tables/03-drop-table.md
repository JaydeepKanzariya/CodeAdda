---
id: drop-table
title: Removing a table
chapter: Creating tables
order: 3
check: state
checkQuery: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1;
---

When a table is no longer needed, `DROP TABLE` deletes it completely: its definition and all of its rows.

```sql
CREATE TABLE scratch (id integer);
DROP TABLE scratch;
```

Dropping a table that does not exist is an error. If you are not sure the table is there, write `DROP TABLE IF EXISTS table_name;` instead.

## Context

With `IF EXISTS`, Postgres only shows a notice when the table is missing, so the statement still succeeds:

```sql
DROP TABLE IF EXISTS no_such_table;
```

## Task

Remove the obsolete `old_menu` table from the database. The `menu` table must stay.

## Hint

- The command is the two keywords from the explanation, followed by the name of the table to remove.

## Solution

```sql
DROP TABLE old_menu;
```

## Setup

```sql
CREATE TABLE menu (
  id integer,
  name text,
  price numeric(6,2)
);

CREATE TABLE old_menu (
  id integer,
  legacy_title text
);
```
