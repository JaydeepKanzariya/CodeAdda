---
id: foreign-key
title: FOREIGN KEY Constraint
chapter: Data Types & Constraints
order: 6
dataset: shop
check: state
checkQuery: SELECT c2.relname AS referenced FROM pg_constraint AS con JOIN pg_class AS c ON c.oid = con.conrelid JOIN pg_class AS c2 ON c2.oid = con.confrelid WHERE c.relname = 'wishlist' AND con.contype = 'f' ORDER BY 1
---

A `FOREIGN KEY` ties a column to another table's key, and Postgres enforces the link.

## Watch it happen
```yaml
tables:
  users:
    columns: [id, name]
    rows:
      - [1, Aarav Mehta]
      - [2, Sofia Rossi]
      - [3, Liam Carter]
  orders:
    columns: [id, user_id, quantity]
    rows:
      - [1, 1, 2]
      - [3, 2, 1]
      - [4, 3, 1]
  attempt:
    label: orders -- INSERT (26, 99, 1) rejected
    columns: [id, user_id, quantity]
    rows:
      - [1, 1, 2]
      - [3, 2, 1]
      - [4, 3, 1]
      - [26, 99, 1]
steps:
  - label: Linked tables
    caption: "Every order points at a customer through `user_id`. Order 3 belongs to user 2, Sofia Rossi."
    show: [users, orders]
    highlight: [{ table: orders, cell: [2, user_id], tone: focus }, { table: users, row: 2, tone: focus }]
    notes:
      - { title: "user_id → users.id", text: "The link is just a number stored in orders." }
  - label: Rejected insert
    caption: "Now someone tries to add order 26 for user 99. No such customer exists, and with a foreign key in place Postgres says no."
    show: [users, attempt]
    highlight: [{ table: attempt, row: 4, tone: removed }]
    notes:
      - { title: "violates foreign key", text: "Key (user_id)=(99) is not present in table users.", tone: removed }
  - label: Orphaned order
    caption: "Picture the same insert on a table with no key. Order 26 gets saved, yet if you ask who bought it, there's no answer: user 99 appears nowhere in `users`."
    show: [users, attempt]
    highlight: [{ table: attempt, cell: [4, user_id], tone: removed }]
    dim: [{ table: attempt, rows: [1, 2, 3] }]
    notes:
      - { title: "a dead-end reference", text: "Per-customer totals stop adding up to the order count.", tone: removed }
  - label: Declare REFERENCES
    caption: "`user_id INTEGER REFERENCES users(id)` is the rule. Every value in this column must already exist as a `users.id`."
    show: [users, orders]
    highlight: [{ table: orders, column: user_id, tone: focus }, { table: users, column: id, tone: focus }]
    notes:
      - { title: "checked on every write", text: "INSERT and UPDATE both go through it.", tone: focus }
  - label: Parent deletes
    caption: "The key keeps watch over `users` as well. Aarav still has order 1, so erasing his row would leave that order hanging. The `ON DELETE` part of the key spells out what Postgres does then."
    show: [users, orders]
    highlight: [{ table: users, row: 1, tone: removed }, { table: orders, row: 1, tone: focus }]
    notes:
      - { title: "default: NO ACTION", text: "The DELETE errors out and nothing changes.", tone: removed }
      - { title: "CASCADE", text: "Aarav and order 1 disappear together." }
      - { title: "SET NULL", text: "Order 1 stays with a blank user_id. Needs a nullable column.", tone: focus }
```

## Context
`column TYPE REFERENCES other_table(other_column)` stops a row from pointing at a value that does not exist there. It is why every `orders.user_id` in `shop` refers to a real customer. Try inserting a row with a bad id afterwards and read the error.

## Task
Create a table named `wishlist` with `id SERIAL PRIMARY KEY`, a required `user_id` referencing
`users(id)`, and a required `product_id` referencing `products(id)`.

## Hint
- `REFERENCES other_table(column)` right after a column's type ties it to that table's primary
  key.
- Both linking columns need to be required, the same way any other `NOT NULL` column is.

## Solution
```sql
CREATE TABLE wishlist (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), product_id INTEGER NOT NULL REFERENCES products(id));
```
