---
id: date-arithmetic
title: Understanding DATE Types
chapter: Data Types & Constraints
order: 4
dataset: shop
check: rows-unordered
---

A `DATE` supports plain arithmetic: add a number of days, or subtract two dates to get the gap.

## Context
`date_column + 7` means seven days later, and one date minus another is a number of days. For months and other units that are not a fixed number of days, use an `INTERVAL`.

## Task
For the orders with `id` 1 through 3, return `id`, `order_date`, and the delivery date 7 days
later as `expected_delivery`.

## Hint
- Adding a plain number to a `DATE` moves it forward that many days.
- Which comparison operator selects "up to and including" a value?

## Solution
```sql
SELECT id, order_date, order_date + 7 AS expected_delivery FROM orders WHERE id <= 3;
```
