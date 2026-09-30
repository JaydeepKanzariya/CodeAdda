---
id: primary-key
title: PRIMARY KEY Constraint
chapter: Data Types & Constraints
order: 5
dataset: shop
check: state
checkQuery: SELECT con.contype FROM pg_constraint AS con JOIN pg_class AS c ON c.oid = con.conrelid WHERE c.relname = 'tags' ORDER BY con.contype
---

A `PRIMARY KEY` marks the column that identifies each row uniquely.

## Context
It combines "no duplicates" with "never `NULL`", and `SERIAL` pairs with it to fill in ids automatically. `UNIQUE` enforces only the no-duplicates half, so add `NOT NULL` when a value must be both present and distinct. A key can also span several columns.

## Task
Create a table named `tags` with `id SERIAL PRIMARY KEY` and a `name` column
(`VARCHAR(40)`) that is both unique and required.

## Hint
- `SERIAL PRIMARY KEY` gives a column an auto-filled, unique, required id.
- Combine two constraints on the same column to make it both distinct and required.

## Solution
```sql
CREATE TABLE tags (id SERIAL PRIMARY KEY, name VARCHAR(40) UNIQUE NOT NULL);
```
