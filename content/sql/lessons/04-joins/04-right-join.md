---
id: right-join
title: RIGHT JOIN
chapter: Joining Tables
order: 4
dataset: shop
check: rows-unordered
---

`RIGHT JOIN` is the mirror of `LEFT JOIN`: it keeps every row from the right table.

## Watch it happen
```yaml
tables:
  orders:
    columns: [id, user_id]
    rows:
      - [1, 1]
      - [2, 1]
      - [3, 2]
      - [5, 4]
  users:
    columns: [id, name]
    rows:
      - [1, Aarav Mehta]
      - [2, Sofia Rossi]
      - [4, Mei Tanaka]
      - [12, Isla Murphy]
  result:
    label: result -- o.id AS order_id, u.name
    columns: [order_id, name]
    rows:
      - [1, Aarav Mehta]
      - [2, Aarav Mehta]
      - [3, Sofia Rossi]
      - [5, Mei Tanaka]
      - [null, Isla Murphy]
steps:
  - label: Keep the right
    caption: "Now `users` is on the right: `FROM orders AS o RIGHT JOIN users AS u`. The right table is the one whose rows are all kept."
    show: [orders, users]
    highlight: [{ table: users, row: 1, tone: kept }, { table: users, row: 2, tone: kept }, { table: users, row: 3, tone: kept }, { table: users, row: 4, tone: kept }]
    notes:
      - { title: "right = the table after JOIN", text: "All 4 users are guaranteed a row.", tone: kept }
  - label: Match
    caption: "`ON o.user_id = u.id` lines each order up with its customer, exactly as in any other join."
    show: [orders, users]
    highlight: [{ table: orders, row: 1, tone: focus }, { table: orders, row: 2, tone: focus }, { table: orders, row: 3, tone: focus }, { table: orders, row: 4, tone: focus }, { table: users, row: 1, tone: focus }, { table: users, row: 2, tone: focus }, { table: users, row: 3, tone: focus }]
    dim: [{ table: users, rows: [4] }]
    notes:
      - { title: "4 matched pairs", text: "Aarav matches orders 1 and 2." }
  - label: No match
    caption: "Isla Murphy has no orders, so her row gets `NULL` for everything from the left table, `orders`."
    show: [users, result]
    highlight: [{ table: users, row: 4, tone: focus }, { table: result, row: 5, tone: focus }, { table: result, cell: [5, order_id], tone: focus }]
    dim: [{ table: users, rows: [1, 2, 3] }, { table: result, rows: [1, 2, 3, 4] }]
    notes:
      - { title: "NULLs land on the left", text: "The side that's allowed to be missing is the left one.", tone: focus }
  - label: Flipped LEFT JOIN
    caption: "The result is the same five rows a `LEFT JOIN` gives with the tables swapped. Many teams write only `LEFT JOIN` so queries read one way."
    show: [orders, users, result]
    highlight: [{ table: result, row: 1, tone: kept }, { table: result, row: 2, tone: kept }, { table: result, row: 3, tone: kept }, { table: result, row: 4, tone: kept }, { table: result, row: 5, tone: kept }]
    notes:
      - { title: "RIGHT = flipped LEFT", text: "A RIGHT JOIN B is B LEFT JOIN A.", tone: kept }
```

## Context
Left-hand columns show `NULL` where there is no match. Any `RIGHT JOIN` can be rewritten as a `LEFT JOIN` by swapping the table order.

```sql
SELECT rv.rating, p.name AS product FROM reviews AS rv RIGHT JOIN products AS p ON p.id = rv.product_id;
```

## Task
Return every department as `department` with its employees as `employee`, including
departments with nobody in them.

## Hint
- Put `employees` on the left and `departments` on the right, then use `RIGHT JOIN` so every
  department appears even without a match.

## Solution
```sql
SELECT d.name AS department, e.name AS employee FROM employees AS e RIGHT JOIN departments AS d ON d.id = e.department_id;
```
