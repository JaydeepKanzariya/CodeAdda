---
id: having
title: HAVING Clause
chapter: Grouping Data
order: 6
dataset: shop
check: rows-unordered
---

`HAVING` filters groups after they are formed, so it can test aggregate values.

## Watch it happen
```yaml
tables:
  grouped:
    label: products -- GROUP BY category_id
    columns: [category_id, count]
    rows:
      - [1, 6]
      - [2, 3]
      - [3, 4]
      - [4, 4]
      - [5, 3]
  result:
    label: result -- HAVING COUNT(*) >= 4
    columns: [category_id, count]
    rows:
      - [1, 6]
      - [3, 4]
      - [4, 4]
steps:
  - label: Groups first
    caption: "`SELECT category_id, COUNT(*) FROM products GROUP BY category_id` has already done its work: all 20 products are now 5 groups."
    show: [grouped]
    highlight: [{ table: grouped, column: count, tone: focus }]
    notes:
      - { title: "6 + 3 + 4 + 4 + 3 = 20", text: "Every product sits in exactly one group." }
  - label: Filter groups
    caption: "`HAVING COUNT(*) >= 4` tests each group, not each product. Categories 2 and 5 have only 3 products, so they drop out."
    show: [grouped]
    highlight: [{ table: grouped, row: 1, tone: kept }, { table: grouped, row: 2, tone: removed }, { table: grouped, row: 3, tone: kept }, { table: grouped, row: 4, tone: kept }, { table: grouped, row: 5, tone: removed }]
    notes:
      - { title: "3 pass, 2 fail", tone: kept }
  - label: WHERE vs HAVING
    caption: "`WHERE` runs before grouping and sees single rows, so it can't use `COUNT(*)`. `HAVING` runs after and sees whole groups."
    show: [grouped]
    highlight: [{ table: grouped, row: 2, tone: removed }, { table: grouped, row: 5, tone: removed }]
    notes:
      - { title: "WHERE filters rows", text: "Before GROUP BY." }
      - { title: "HAVING filters groups", text: "After GROUP BY, so aggregates are allowed.", tone: focus }
  - label: Result
    caption: "Three categories have at least four products. The rows inside each group never change, only which groups are shown."
    show: [grouped, result]
    highlight: [{ table: result, row: 1, tone: kept }, { table: result, row: 2, tone: kept }, { table: result, row: 3, tone: kept }]
    dim: [{ table: grouped, rows: [2, 5] }]
    notes:
      - { title: "5 groups in, 3 out", tone: kept }
```

## Context
`WHERE` runs before grouping and cannot reference `COUNT(*)`. The two can share a query: `WHERE` trims rows first, `HAVING` trims groups after.

```sql
SELECT department_id, COUNT(*) AS employees FROM employees GROUP BY department_id HAVING COUNT(*) >= 2;
```

## Task
Return the countries with more than 2 users: `country` and their number of users as `users`.

## Hint
- Group by `country` and count as before, then add `HAVING` to keep only groups above 2.

## Solution
```sql
SELECT country, COUNT(*) AS users FROM users GROUP BY country HAVING COUNT(*) > 2;
```
