---
id: update-where
title: UPDATE with WHERE Condition
chapter: Modifying Data
order: 6
dataset: shop
check: state
checkQuery: SELECT id, name, city, country FROM users ORDER BY id
---

`WHERE` decides which rows an `UPDATE` touches, so it is the safety catch on every change you make.

## Watch it happen
```yaml
tables:
  users:
    columns: [id, name, city]
    rows:
      - [1, Aarav Mehta, Mumbai]
      - [2, Sofia Rossi, Milan]
      - [3, Liam Carter, Denver]
      - [4, Mei Tanaka, Osaka]
  after:
    label: users -- after update
    columns: [id, name, city]
    rows:
      - [1, Aarav Mehta, Mumbai]
      - [2, Sofia Rossi, Milan]
      - [3, Liam Carter, Chicago]
      - [4, Mei Tanaka, Osaka]
  no_where:
    label: users -- if WHERE is missing
    columns: [id, name, city]
    rows:
      - [1, Aarav Mehta, Chicago]
      - [2, Sofia Rossi, Chicago]
      - [3, Liam Carter, Chicago]
      - [4, Mei Tanaka, Chicago]
steps:
  - label: Find the row
    caption: "Liam Carter has moved to Chicago. `WHERE id = 3` points the change at his row and nobody else's."
    show: [users]
    highlight: [{ table: users, row: 3, tone: focus }]
    dim: [{ table: users, rows: [1, 2, 4] }]
    notes:
      - { title: "1 row matches", text: "id is unique, so this can't hit anyone else.", tone: focus }
  - label: Change it
    caption: "`UPDATE users SET city = 'Chicago' WHERE id = 3` rewrites one cell. Every other row is left exactly as it was."
    show: [users, after]
    highlight: [{ table: users, cell: [3, city], tone: focus }, { table: after, cell: [3, city], tone: kept }]
    notes:
      - { title: "UPDATE 1", text: "Postgres reports one row changed.", tone: kept }
  - label: Without WHERE
    caption: "Leave off the `WHERE` and `UPDATE users SET city = 'Chicago'` applies to the whole table. Everyone now lives in Chicago."
    show: [users, no_where]
    highlight: [{ table: no_where, column: city, tone: removed }]
    notes:
      - { title: "every row changes", text: "4 rows here, all 15 in the real table.", tone: removed }
  - label: Check first
    caption: "A safe habit: run `SELECT * FROM users WHERE id = 3` first. If it shows the rows you expect, reuse that same `WHERE` in the `UPDATE`."
    show: [after]
    highlight: [{ table: after, cell: [3, city], tone: kept }]
    notes:
      - { title: "same WHERE, twice", text: "SELECT to look, then UPDATE to change.", tone: focus }
```

## Context
Without a `WHERE`, `UPDATE` rewrites every row in the table. Filter on a unique column such as `email` when you mean to change exactly one row. The new value can also be an expression built from the row's own columns, like `stock + 10`.

## Task
Sofia Rossi has moved. Set `city` to `'Toronto'` and `country` to `'Canada'` for the user whose email is `sofia@example.com`, and change no other row.

## Hint
- Without `WHERE`, `UPDATE` changes every row.
- Match on the unique `email` column.

## Solution
```sql
UPDATE users SET city = 'Toronto', country = 'Canada' WHERE email = 'sofia@example.com';
```
