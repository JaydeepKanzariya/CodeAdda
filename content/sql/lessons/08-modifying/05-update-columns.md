---
id: update-columns
title: UPDATE Multiple Columns
chapter: Modifying Data
order: 5
dataset: shop
check: state
checkQuery: SELECT id, price, stock FROM products ORDER BY id
---

`SET` takes several assignments, so one `UPDATE` can change more than one column.

## Context
Separate the assignments with commas. They all apply together to each row the `WHERE` matches, using the values the row had before the statement.

## Task
Set the "Smart Watch" product's `price` to 139.00 and its `stock` to 20, in one statement.

## Hint
- `SET` accepts more than one assignment — separate them with commas.
- Filter on the product's name, not its id.

## Solution
```sql
UPDATE products SET price = 139.00, stock = 20 WHERE name = 'Smart Watch';
```
