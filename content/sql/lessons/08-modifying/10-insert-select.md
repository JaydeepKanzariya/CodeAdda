---
id: insert-select
title: INSERT INTO SELECT
chapter: Modifying Data
order: 10
dataset: shop
check: state
checkQuery: SELECT product_id, user_id, rating, comment FROM reviews ORDER BY id
---

`INSERT` can take its rows from a `SELECT` instead of a `VALUES` list.

## Context
Each row the `SELECT` returns becomes a new row, with its columns matched to the `INSERT` column list by position. Constants in the select list are repeated on every new row. It is how you add one row per existing row that matches a condition.

## Task
Give every user from Ireland a 5-star review of product 6 with the comment "Loved it" dated
2024-05-01, using one `INSERT ... SELECT` statement.

## Hint
- Select the constant values `6`, `5`, `'Loved it'` and the date alongside `id` from `users`.
- Filter `users` with `WHERE country = 'Ireland'`.

## Solution
```sql
INSERT INTO reviews (product_id, user_id, rating, comment, review_date) SELECT 6, id, 5, 'Loved it', DATE '2024-05-01' FROM users WHERE country = 'Ireland';
```
