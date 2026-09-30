---
id: group-by
title: GROUP BY
chapter: Grouping Data
order: 5
dataset: shop
check: rows-unordered
---

`GROUP BY` splits rows into groups that share a value and computes an aggregate for each group.

## Watch it happen
```yaml
tables:
  products:
    columns: [name, category_id, price]
    rows:
      - [The Pragmatic Coder, 2, "39.95"]
      - [Building Blocks Set, 5, "49.99"]
      - [Data at Scale, 2, "54.00"]
      - [Puzzle 1000, 5, "15.50"]
      - [SQL in Practice, 2, "29.00"]
  result:
    label: result -- GROUP BY category_id
    columns: [category_id, count]
    rows:
      - [2, 3]
      - [5, 2]
steps:
  - label: Rows
    caption: "Five products from two categories, in no useful order. We want to know how many products each category has."
    show: [products]
    highlight: [{ table: products, column: category_id, tone: focus }]
    notes:
      - { title: "the grouping column", text: "category_id decides where each row goes.", tone: focus }
  - label: Buckets
    caption: "`GROUP BY category_id` sorts the rows into buckets, one for each distinct value. Rows with the same `category_id` land together."
    show: [products]
    highlight: [{ table: products, row: 1, tone: focus }, { table: products, row: 3, tone: focus }, { table: products, row: 5, tone: focus }, { table: products, row: 2, tone: kept }, { table: products, row: 4, tone: kept }]
    notes:
      - { title: "category 2: 3 rows", tone: focus }
      - { title: "category 5: 2 rows", tone: kept }
  - label: One row per group
    caption: "`SELECT category_id, COUNT(*) FROM products GROUP BY category_id` turns each bucket into a single result row."
    show: [products, result]
    highlight: [{ table: products, row: 1, tone: focus }, { table: products, row: 3, tone: focus }, { table: products, row: 5, tone: focus }, { table: products, row: 2, tone: kept }, { table: products, row: 4, tone: kept }, { table: result, row: 1, tone: focus }, { table: result, row: 2, tone: kept }]
    notes:
      - { title: "5 rows in, 2 groups out" }
  - label: Aggregate per group
    caption: "Any aggregate works per bucket, not just `COUNT`. Every plain column in the `SELECT` list must also be in `GROUP BY`."
    show: [result]
    highlight: [{ table: result, row: 1, tone: focus }, { table: result, row: 2, tone: kept }]
    notes:
      - { title: "try SUM(price)", text: "Category 2 totals 122.95 and category 5 totals 65.49." }
      - { title: "no name column here", text: "name differs inside a group, so it can't be shown as-is.", tone: focus }
```

## Context
You get one result row per group. Any plain column in the `SELECT` list must also appear in `GROUP BY`.

```sql
SELECT department_id, COUNT(*) AS employees FROM employees GROUP BY department_id;
```

## Task
Return each `country` together with its number of users as `users`.

## Hint
- Group `users` by `country` and count the rows in each group.

## Solution
```sql
SELECT country, COUNT(*) AS users FROM users GROUP BY country;
```
