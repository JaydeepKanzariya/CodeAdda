---
id: union-all
title: UNION ALL
chapter: Set Operators
order: 2
dataset: shop
check: rows-unordered
---

`UNION ALL` stacks two result sets like `UNION` but keeps every row, duplicates included.

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
    label: result -- UNION ALL
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
steps:
  - label: Stack
    caption: "`UNION ALL` stacks the second result under the first, just like `UNION`. Four rows plus five rows."
    show: [users, suppliers, stacked]
    highlight: [{ table: stacked, column: country, tone: focus }]
    notes:
      - { title: "4 + 5 = 9 rows", tone: focus }
  - label: Keep duplicates
    caption: "Here's the difference: nothing is removed. The repeated India and USA rows all stay."
    show: [stacked]
    highlight: [{ table: stacked, row: 4, tone: kept }, { table: stacked, row: 5, tone: kept }, { table: stacked, row: 6, tone: kept }]
    notes:
      - { title: "duplicates kept", text: "India 3 times, USA twice, exactly as the queries returned them.", tone: kept }
  - label: Faster
    caption: "Removing duplicates means comparing every row with the others. `UNION ALL` skips that step, so it does less work."
    show: [stacked]
    notes:
      - { title: "no de-duplication pass", text: "Use UNION ALL when repeats can't happen or you want them." }
  - label: Result
    caption: "Nine rows, one per row from each query. Useful when you want to count across both, like how many customers and suppliers each country has."
    show: [users, suppliers, stacked]
    highlight: [{ table: stacked, column: country, tone: kept }]
    notes:
      - { title: "9 rows in, 9 rows out", text: "UNION would have returned 6.", tone: kept }
```

## Context
It skips the duplicate check, so it is cheaper. Use it when duplicates matter or cannot occur.

```sql
SELECT name FROM categories UNION ALL SELECT name FROM suppliers;
```

## Task
Return the same list as the previous lesson — every country from `users` or `suppliers`, as a
single column `country` — but keep duplicates this time.

## Hint
- Same two queries as `UNION`, different keyword.
- `UNION ALL` never removes rows, so a country with users in three rows still appears three times.

## Solution
```sql
SELECT country FROM users UNION ALL SELECT country FROM suppliers;
```
