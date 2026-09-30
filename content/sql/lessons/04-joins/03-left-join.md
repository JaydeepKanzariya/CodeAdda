---
id: left-join
title: LEFT JOIN
chapter: Joining Tables
order: 3
dataset: shop
check: rows-unordered
---

`LEFT JOIN` keeps every row from the left table, even when nothing on the right matches.

## Watch it happen
```yaml
tables:
  users:
    columns: [id, name]
    rows:
      - [1, Aarav Mehta]
      - [2, Sofia Rossi]
      - [4, Mei Tanaka]
      - [12, Isla Murphy]
  orders:
    columns: [id, user_id]
    rows:
      - [1, 1]
      - [2, 1]
      - [3, 2]
      - [5, 4]
  result:
    label: result -- u.name, o.id AS order_id
    columns: [name, order_id]
    rows:
      - [Aarav Mehta, 1]
      - [Aarav Mehta, 2]
      - [Sofia Rossi, 3]
      - [Mei Tanaka, 5]
      - [Isla Murphy, null]
steps:
  - label: Keep the left
    caption: "`FROM users AS u LEFT JOIN orders AS o` promises one thing up front: every row of the left table, `users`, makes it into the result."
    show: [users, orders]
    highlight: [{ table: users, row: 1, tone: kept }, { table: users, row: 2, tone: kept }, { table: users, row: 3, tone: kept }, { table: users, row: 4, tone: kept }]
    notes:
      - { title: "left = the table after FROM", text: "All 4 users are guaranteed a row.", tone: kept }
  - label: Match orders
    caption: "`ON o.user_id = u.id` finds each user's orders. Aarav has two, so he will appear twice."
    show: [users, orders]
    highlight: [{ table: users, row: 1, tone: focus }, { table: users, row: 2, tone: focus }, { table: users, row: 3, tone: focus }, { table: orders, row: 1, tone: focus }, { table: orders, row: 2, tone: focus }, { table: orders, row: 3, tone: focus }, { table: orders, row: 4, tone: focus }]
    dim: [{ table: users, rows: [4] }]
    notes:
      - { title: "4 orders, 3 users", text: "One user with two orders gives two rows." }
  - label: No match
    caption: "Isla Murphy has no orders at all. She still gets a row, and the columns from `orders` are filled with `NULL`."
    show: [users, result]
    highlight: [{ table: users, row: 4, tone: focus }, { table: result, row: 5, tone: focus }, { table: result, cell: [5, order_id], tone: focus }]
    dim: [{ table: users, rows: [1, 2, 3] }, { table: result, rows: [1, 2, 3, 4] }]
    notes:
      - { title: "NULL means no partner", text: "An inner join would have dropped Isla completely.", tone: focus }
  - label: Result
    caption: "Five rows: four matched pairs plus Isla with a `NULL` order. Add `WHERE o.id IS NULL` and you'd get only the customers who never ordered."
    show: [users, orders, result]
    highlight: [{ table: result, row: 1, tone: kept }, { table: result, row: 2, tone: kept }, { table: result, row: 3, tone: kept }, { table: result, row: 4, tone: kept }, { table: result, row: 5, tone: kept }]
    notes:
      - { title: "4 users in, 5 rows out", tone: kept }
```

## Context
The right-hand columns become `NULL` for unmatched rows. Reach for it whenever "including the ones with nothing" matters.

```sql
SELECT c.name AS category, pr.name AS product FROM categories AS c LEFT JOIN products AS pr ON pr.category_id = c.id;
```

## Task
Return every employee as `employee` with their department as `department`, including employees
who have no department.

## Hint
- The employees table is on the left of the join, so it keeps every employee row.
- Employees without a department will show `NULL` for `department`.

## Solution
```sql
SELECT e.name AS employee, d.name AS department FROM employees AS e LEFT JOIN departments AS d ON d.id = e.department_id;
```
