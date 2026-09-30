---
id: lag
title: LAG Window Function
chapter: Advanced Topics
order: 6
dataset: shop
check: rows-ordered
---

`LAG` reads a value from the previous row in a given order.

## Context
`LAG(column) OVER (ORDER BY ...)` returns `NULL` for the first row, since nothing precedes it. `LEAD` does the same looking forward. Use them for "compare with the previous row" questions without a self-join.

## Task
Return each order's `id`, `order_date`, and the previous order's date as `previous_order`,
ordered by `order_date` then `id`.

## Hint
- `LAG(column) OVER (ORDER BY ...)` looks back one row in that order; the first row has nothing
  before it.
- Use the same ordering for the window and for the final result, so the rows and their
  "previous" values line up.

## Solution
```sql
SELECT id, order_date, LAG(order_date) OVER (ORDER BY order_date, id) AS previous_order FROM orders ORDER BY order_date, id;
```
