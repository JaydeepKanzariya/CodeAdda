---
id: update-one
title: UPDATE Single Column
chapter: Modifying Data
order: 4
dataset: shop
check: state
checkQuery: SELECT id, stock FROM products ORDER BY id
---

`UPDATE` changes values in rows that already exist.

## Context
`UPDATE table SET column = value WHERE condition` rewrites one column on every row the `WHERE` matches. Leave the `WHERE` out and every row changes, so test the condition with a `SELECT` first when you are unsure.

## Task
Set the `stock` of the product with `id` 5 to 100.

## Hint
- `UPDATE table SET column = value WHERE condition` — only the matched row's column changes.
- Match on the product's `id`, not its name.

## Solution
```sql
UPDATE products SET stock = 100 WHERE id = 5;
```
