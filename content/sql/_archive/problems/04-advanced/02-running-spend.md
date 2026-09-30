---
id: running-spend
title: Running Spend per Customer
chapter: Advanced
order: 2
difficulty: Hard
dataset: shop
check: rows-ordered
---

Customer success wants to see how each customer's total spend builds up order by order, so they
can spot high-value customers early.

## Task
For every order, return the customer's `name`, the order's `order_date`, and `running_total` —
that customer's cumulative spend (`quantity * price`) across their orders up to and including
this one. Order the rows by `name` alphabetically, then by `order_date`, then by the order's
`id`.

## Example
| name | order_date | running_total |
|---|---|---|
| Aarav Mehta | 2024-01-05 | 119.98 |
| Aarav Mehta | 2024-01-05 | 159.93 |
| Aarav Mehta | 2024-03-12 | 238.93 |
| Ava Thompson | 2024-03-04 | 54.00 |
| Ava Thompson | 2024-04-23 | 113.99 |

## Hint
- A window aggregate can accumulate a running value without collapsing the rows.
- Think about what should make the total restart for a different customer, and what order the
  rows need to accumulate in to mean "so far".

## Solution
```sql
SELECT u.name, o.order_date, SUM(o.quantity * p.price) OVER (PARTITION BY o.user_id ORDER BY o.order_date, o.id) AS running_total FROM orders AS o JOIN users AS u ON u.id = o.user_id JOIN products AS p ON p.id = o.product_id ORDER BY u.name, o.order_date, o.id;
```
