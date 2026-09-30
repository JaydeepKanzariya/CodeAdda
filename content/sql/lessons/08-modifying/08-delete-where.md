---
id: delete-where
title: DELETE with WHERE
chapter: Modifying Data
order: 8
dataset: shop
check: state
checkQuery: SELECT id FROM orders ORDER BY id
---

`DELETE` removes whole rows from a table.

## Context
There is no column list, because the entire row goes. `WHERE` picks the victims exactly as in `SELECT`, and omitting it empties the table. Remember that `NULL` needs `IS NULL`, not `=`.

## Task
Delete every order that has no `status` (a `NULL` status).

## Hint
- `DELETE FROM table WHERE condition` removes whole rows that match the condition.
- A missing value can't be matched with `= NULL` — which comparison is built for that?

## Solution
```sql
DELETE FROM orders WHERE status IS NULL;
```
