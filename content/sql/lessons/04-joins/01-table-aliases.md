---
id: table-aliases
title: Table Aliases
chapter: Joining Tables
order: 1
dataset: shop
check: rows-unordered
---

A table alias gives a table a short nickname for the rest of the query.

## Watch it happen
```yaml
tables:
  orders:
    columns: [id, user_id]
    rows:
      - [1, 1]
      - [3, 2]
      - [4, 3]
      - [5, 4]
  users:
    columns: [id, name]
    rows:
      - [1, Aarav Mehta]
      - [2, Sofia Rossi]
      - [3, Liam Carter]
      - [4, Mei Tanaka]
  result:
    label: result -- o.id, u.name
    columns: [id, name]
    rows:
      - [1, Aarav Mehta]
      - [3, Sofia Rossi]
      - [4, Liam Carter]
      - [5, Mei Tanaka]
steps:
  - label: Repeated names
    caption: "Once a query uses two tables, you end up writing their names again and again. `FROM orders AS o` gives `orders` the nickname `o`."
    show: [orders, users]
    labels: { orders: "orders AS o", users: "users AS u" }
    notes:
      - { title: "an alias is a nickname", text: "It only lasts for this one query.", tone: focus }
  - label: Same column name
    caption: "Both tables have a column called `id`. Writing just `id` leaves Postgres guessing which one you mean, so it stops with an error."
    show: [orders, users]
    labels: { orders: "orders AS o", users: "users AS u" }
    highlight: [{ table: orders, column: id, tone: focus }, { table: users, column: id, tone: focus }]
    notes:
      - { title: "column reference is ambiguous", text: "That's the error you get for a bare id here.", tone: removed }
  - label: Qualify columns
    caption: "Put the alias and a dot in front: `o.user_id` and `u.id` say exactly which table each column comes from."
    show: [orders, users]
    labels: { orders: "orders AS o", users: "users AS u" }
    highlight: [{ table: orders, column: user_id, tone: focus }, { table: users, column: id, tone: focus }]
    notes:
      - { title: "o.user_id = u.id", text: "Short to write and impossible to misread.", tone: focus }
  - label: Alias in SELECT
    caption: "`SELECT o.id, u.name FROM orders AS o JOIN users AS u ON u.id = o.user_id` uses the aliases everywhere, even before they are defined."
    show: [orders, users, result]
    labels: { orders: "orders AS o", users: "users AS u" }
    highlight: [{ table: orders, column: id, tone: focus }, { table: users, column: name, tone: focus }, { table: result, row: 1, tone: kept }, { table: result, row: 2, tone: kept }, { table: result, row: 3, tone: kept }, { table: result, row: 4, tone: kept }]
    notes:
      - { title: "the alias isn't in the output", text: "Result columns are still called id and name.", tone: kept }
```

## Context
Write it right after the table name, with `AS` optional. Aliases become essential once a query names several tables and columns must say which one they belong to.

```sql
SELECT o.id, o.order_date FROM orders AS o;
```

## Task
Using the alias `p`, return the `name` and `stock` of products that are out of stock.

## Hint
- Write `FROM products AS p`, then refer to its columns as `p.name` and `p.stock`.

## Solution
```sql
SELECT p.name, p.stock FROM products AS p WHERE p.stock = 0;
```
