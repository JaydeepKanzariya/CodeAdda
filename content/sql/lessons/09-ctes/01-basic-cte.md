---
id: basic-cte
title: Basic CTE with WITH
chapter: Common Table Expressions
order: 1
dataset: shop
check: rows-unordered
---

A common table expression names a subquery so the rest of the statement can use it like a table.

## Watch it happen
```yaml
tables:
  orders:
    columns: [id, user_id, quantity]
    rows:
      - [1, 1, 2]
      - [2, 1, 1]
      - [4, 3, 1]
      - [15, 3, 2]
      - [16, 1, 1]
  units:
    label: units (CTE)
    columns: [user_id, total]
    rows:
      - [1, 4]
      - [3, 3]
  result:
    label: result -- WHERE total >= 4
    columns: [user_id, total]
    rows:
      - [1, 4]
steps:
  - label: Name a step
    caption: "`WITH units AS (SELECT user_id, SUM(quantity) AS total FROM orders GROUP BY user_id)` runs a query and gives its result the name `units`."
    show: [orders, units]
    highlight: [{ table: orders, row: 1, tone: focus }, { table: orders, row: 2, tone: focus }, { table: orders, row: 5, tone: focus }, { table: units, row: 1, tone: focus }]
    notes:
      - { title: "2 + 1 + 1 = 4", text: "All of user 1's orders add up to 4 units.", tone: focus }
  - label: Use it like a table
    caption: "After the `WITH` part, `units` behaves like a table: `SELECT user_id, total FROM units WHERE total >= 4`."
    show: [units]
    highlight: [{ table: units, row: 1, tone: focus }, { table: units, row: 2, tone: focus }]
    notes:
      - { title: "temporary", text: "units exists only while this one statement runs." }
  - label: Result
    caption: "User 1 bought 4 units and passes the filter. User 3 bought 3 and doesn't."
    show: [units, result]
    highlight: [{ table: units, row: 1, tone: kept }, { table: units, row: 2, tone: removed }, { table: result, row: 1, tone: kept }]
    notes:
      - { title: "2 rows in, 1 row out", tone: kept }
  - label: Readability
    caption: "You could write the same thing as a subquery inside `FROM`. The `WITH` version reads top to bottom, one named step at a time."
    show: [result]
    highlight: [{ table: result, row: 1, tone: kept }]
    notes:
      - { title: "a name explains intent", text: "units says what the numbers mean before you use them.", tone: focus }
```

## Context
`WITH name AS (SELECT ...) SELECT ... FROM name` does not change what you can compute, but it makes multi-step queries easier to read and edit than a nested subquery.

## Task
Using a CTE named `big_orders`, return the `id`, `user_id` and `quantity` of orders with a
quantity of 2 or more.

## Hint
- Put the quantity condition inside the CTE's own `SELECT`, not in the outer query.
- Once the CTE is defined, query it in the final `SELECT` the same way you'd query a table.

## Solution
```sql
WITH big_orders AS (SELECT * FROM orders WHERE quantity >= 2) SELECT id, user_id, quantity FROM big_orders;
```
