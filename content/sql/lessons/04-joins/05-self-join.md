---
id: self-join
title: Self JOIN
chapter: Joining Tables
order: 5
dataset: shop
check: rows-unordered
---

A table can be joined to a second copy of itself, useful when one row points at another in the same table.

## Context
Give each copy its own alias so the query can tell them apart. This pairs products from the same supplier without pairing a product with itself or repeating a pair.

```sql
SELECT a.name AS product, b.name AS same_supplier FROM products AS a JOIN products AS b ON b.supplier_id = a.supplier_id AND b.id > a.id;
```

## Task
Return `employee` and `manager` names for employees who have a manager.

## Hint
- Join `employees` to itself with two aliases, one for the employee and one for the manager.
- Match the employee's `manager_id` to the manager's `id`.

## Solution
```sql
SELECT e.name AS employee, m.name AS manager FROM employees AS e JOIN employees AS m ON m.id = e.manager_id;
```
