---
id: union
title: UNION
chapter: Set Operators
order: 1
dataset: shop
check: rows-unordered
---

`UNION` stacks the results of two `SELECT` statements into one and removes duplicate rows.

## Watch it happen
```yaml
tables:
  users:
    label: SELECT country FROM users
    columns: [country]
    rows:
      - [India]
      - [Italy]
      - [USA]
      - [India]
  suppliers:
    label: SELECT country FROM suppliers
    columns: [country]
    rows:
      - [India]
      - [USA]
      - [Japan]
      - [Germany]
      - [Chile]
  stacked:
    label: stacked
    columns: [country]
    rows:
      - [India]
      - [Italy]
      - [USA]
      - [India]
      - [India]
      - [USA]
      - [Japan]
      - [Germany]
      - [Chile]
  result:
    label: result -- UNION
    columns: [country]
    rows:
      - [India]
      - [Italy]
      - [USA]
      - [Japan]
      - [Germany]
      - [Chile]
steps:
  - label: Two results
    caption: "Two separate queries, each returning one `country` column: four customers from `users` and all five `suppliers`."
    show: [users, suppliers]
    notes:
      - { title: "same shape", text: "One column each, both text. That's what lets them combine." }
  - label: Stack
    caption: "`UNION` puts the second result underneath the first. The column name comes from the first query."
    show: [users, suppliers, stacked]
    highlight: [{ table: stacked, column: country, tone: focus }]
    notes:
      - { title: "4 + 5 = 9 rows", tone: focus }
  - label: Remove duplicates
    caption: "Then `UNION` throws away repeated rows, including repeats inside a single query. India appears three times and USA twice."
    show: [stacked]
    highlight: [{ table: stacked, row: 4, tone: removed }, { table: stacked, row: 5, tone: removed }, { table: stacked, row: 6, tone: removed }]
    notes:
      - { title: "3 duplicates dropped", text: "Two extra Indias and one extra USA.", tone: removed }
  - label: Result
    caption: "Six distinct countries. Without an `ORDER BY`, the order of a `UNION` isn't guaranteed."
    show: [stacked, result]
    highlight: [{ table: stacked, row: 4, tone: removed }, { table: stacked, row: 5, tone: removed }, { table: stacked, row: 6, tone: removed }, { table: result, column: country, tone: kept }]
    notes:
      - { title: "9 rows in, 6 rows out", tone: kept }
```

## Context
Both statements need the same number of columns with compatible types, and the names come from the first one.

```sql
SELECT category_id FROM products UNION SELECT category_id FROM products WHERE stock = 0;
```

## Task
Return every country that appears in `users` or `suppliers`, once each, as a single column
`country`.

## Hint
- Write one `SELECT country FROM ...` for each table and join them with `UNION`.
- You don't need `DISTINCT` — `UNION` already removes duplicates.

## Solution
```sql
SELECT country FROM users UNION SELECT country FROM suppliers;
```
