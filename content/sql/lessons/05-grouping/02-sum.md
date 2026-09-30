---
id: sum
title: SUM Function
chapter: Grouping Data
order: 2
dataset: shop
check: rows-unordered
---

`SUM` adds up a numeric column across all the rows it is given and returns one total.

## Context
`NULL` values are ignored, and over zero rows `SUM` returns `NULL` rather than 0.

```sql
SELECT SUM(salary) AS total_payroll FROM employees;
```

## Task
Return the total quantity ordered across all orders, as `total_items`.

## Hint
- Apply `SUM` to the `quantity` column of `orders`.

## Solution
```sql
SELECT SUM(quantity) AS total_items FROM orders;
```
