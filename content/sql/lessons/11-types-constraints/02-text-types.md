---
id: text-types
title: Understanding VARCHAR vs TEXT
chapter: Data Types & Constraints
order: 2
dataset: shop
check: state
checkQuery: SELECT column_name, data_type, character_maximum_length, is_nullable FROM information_schema.columns WHERE table_name = 'notes' ORDER BY ordinal_position
---

`VARCHAR(n)` caps the length of a text value, while `TEXT` does not.

## Context
In Postgres the two perform almost the same, so the choice is about intent: `VARCHAR(n)` makes the database enforce a limit, which suits short, bounded fields, and `TEXT` suits open-ended content like descriptions and comments.

## Task
Create a table named `notes` with a required `title` (`VARCHAR(80)`, `NOT NULL`) and an optional
`body` (`TEXT`).

## Hint
- One column needs a length limit and must always be present; the other can be open-ended and
  optional.
- `NOT NULL` goes right after a column's type.

## Solution
```sql
CREATE TABLE notes (title VARCHAR(80) NOT NULL, body TEXT);
```
