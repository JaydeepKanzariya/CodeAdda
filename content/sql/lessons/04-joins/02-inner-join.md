---
id: inner-join
title: INNER JOIN Basics
chapter: Joining Tables
order: 2
dataset: shop
check: rows-unordered
---

`INNER JOIN` combines rows from two tables where a condition holds, so related data can be read together.

## Watch it happen
```yaml
tables:
  orders:
    columns: [id, user_id, product_id]
    rows:
      - [1, 1, 1]
      - [3, 2, 2]
      - [4, 3, 4]
      - [13, 13, 15]
  users:
    columns: [id, email]
    rows:
      - [1, aarav@example.com]
      - [2, sofia@example.com]
      - [3, liam@example.com]
      - [12, isla@example.com]
  result:
    label: result -- order, product, email
    columns: [id, product_id, email]
    rows:
      - [1, 1, aarav@example.com]
      - [3, 2, sofia@example.com]
      - [4, 4, liam@example.com]
steps:
  - label: Two tables
    caption: "An order only stores a `user_id`. To reach the customer's email, we need the matching row from `users`."
    show: [orders, users]
    highlight: [{ table: orders, column: user_id, tone: focus }, { table: users, column: id, tone: focus }]
    notes:
      - { title: "the join key", text: "orders.user_id points at users.id.", tone: focus }
  - label: Match on key
    caption: "The join condition says an order and a user belong together when the user's `id` equals the order's `user_id`. Each order looks for its partner."
    show: [orders, users]
    highlight: [{ table: orders, row: 1, tone: kept }, { table: orders, row: 2, tone: kept }, { table: orders, row: 3, tone: kept }, { table: users, row: 1, tone: kept }, { table: users, row: 2, tone: kept }, { table: users, row: 3, tone: kept }]
    dim: [{ table: orders, rows: [4] }, { table: users, rows: [4] }]
    notes:
      - { title: "3 pairs found", text: "Orders 1, 3 and 4 each meet their customer.", tone: kept }
  - label: No match, no row
    caption: "In this slice, order 13 belongs to user 13, who isn't shown, and user 12 has no orders. An inner join drops both."
    show: [orders, users]
    highlight: [{ table: orders, row: 4, tone: removed }, { table: users, row: 4, tone: removed }]
    dim: [{ table: orders, rows: [1, 2, 3] }, { table: users, rows: [1, 2, 3] }]
    notes:
      - { title: "both sides must match", text: "A row with no partner never reaches the result.", tone: removed }
  - label: Result
    caption: "Each matched pair becomes one wide row, so you can pick columns from either side, like the order's `id` and `product_id` next to the customer's `email`. Four orders went in and three rows came out."
    show: [orders, users, result]
    highlight: [{ table: orders, row: 1, tone: kept }, { table: orders, row: 2, tone: kept }, { table: orders, row: 3, tone: kept }, { table: result, row: 1, tone: kept }, { table: result, row: 2, tone: kept }, { table: result, row: 3, tone: kept }]
    dim: [{ table: orders, rows: [4] }, { table: users, rows: [4] }]
```

## Context
The `ON` clause says how rows match, here a review's `product_id` against the product's `id`. Rows with no partner on either side are left out.

```sql
SELECT r.rating, p.name FROM reviews AS r INNER JOIN products AS p ON p.id = r.product_id;
```

## Task
Return each order's `id` and the customer's name as `customer`.

## Hint
- Join `orders` to `users` where the user's `id` matches the order's `user_id`.
- Alias the customer's name column with `AS customer`.

## Solution
```sql
SELECT o.id, u.name AS customer FROM orders AS o INNER JOIN users AS u ON u.id = o.user_id;
```
