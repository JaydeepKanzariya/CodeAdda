---
id: aliases
title: Column Aliases with AS
chapter: Querying Data
order: 5
dataset: shop
check: rows-unordered
---

`AS` gives a column a new name in the result without touching the table.

## Context
Aliases make output easier to read, and they are needed when a column is calculated, such as `price * 2 AS double_price`.

```sql
SELECT name AS department, location AS city FROM departments;
```

## Task
Return every product's `name` as `product_name` and its `price` as `unit_price`.

## Hint
- Write `column AS new_name` for each column.

## Solution
```sql
SELECT name AS product_name, price AS unit_price FROM products;
```
