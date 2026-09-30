---
id: count
title: COUNT Function
chapter: Grouping Data
order: 1
dataset: shop
check: rows-unordered
---

`COUNT` is an aggregate: it collapses many rows into a single number.

## Watch it happen
```yaml
tables:
  orders:
    columns: [id, status]
    rows:
      - [9, pending]
      - [10, delivered]
      - [11, null]
      - [12, delivered]
      - [13, pending]
  result:
    label: result -- one row
    columns: [total, with_status]
    rows:
      - [5, 4]
steps:
  - label: Many rows
    caption: "Here are five rows from `orders`. One of them, order 11, has no `status` yet."
    show: [orders]
    highlight: [{ table: orders, cell: [3, status], tone: focus }]
    notes:
      - { title: "5 rows, 1 NULL", text: "Watch what happens to that NULL.", tone: focus }
  - label: COUNT(*)
    caption: "`COUNT(*)` counts rows. It doesn't look inside them, so the row with a `NULL` status counts like any other."
    show: [orders]
    highlight: [{ table: orders, row: 1, tone: kept }, { table: orders, row: 2, tone: kept }, { table: orders, row: 3, tone: kept }, { table: orders, row: 4, tone: kept }, { table: orders, row: 5, tone: kept }]
    notes:
      - { title: "COUNT(*) = 5", text: "Every row, no questions asked.", tone: kept }
  - label: COUNT(status)
    caption: "`COUNT(status)` counts only the rows where `status` has a value. Order 11 is skipped."
    show: [orders]
    highlight: [{ table: orders, row: 1, tone: kept }, { table: orders, row: 2, tone: kept }, { table: orders, row: 3, tone: removed }, { table: orders, row: 4, tone: kept }, { table: orders, row: 5, tone: kept }]
    notes:
      - { title: "COUNT(status) = 4", text: "NULLs are left out of the count.", tone: removed }
  - label: Result
    caption: "`SELECT COUNT(*) AS total, COUNT(status) AS with_status FROM orders` squeezes five rows into a single row of numbers."
    show: [orders, result]
    highlight: [{ table: result, row: 1, tone: kept }]
    notes:
      - { title: "many rows in, one row out", text: "That collapse is what makes COUNT an aggregate.", tone: kept }
```

## Context
`COUNT(*)` counts every row, while `COUNT(column)` skips rows where that column is `NULL`.

```sql
SELECT COUNT(*) AS total_products FROM products;
```

## Task
Return the number of users as `total_users`.

## Hint
- `COUNT(*)` counts every row in the table.
- Give the result the alias `total_users`.

## Solution
```sql
SELECT COUNT(*) AS total_users FROM users;
```
