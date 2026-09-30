---
id: comparison
title: Comparison Operators
chapter: Filtering Data
order: 2
dataset: shop
check: rows-unordered
---

Beyond `=`, `WHERE` understands `<`, `>`, `<=`, `>=` and `<>` (or `!=`) for "not equal".

## Context
They work on numbers, dates and text. An earlier date counts as "less than" a later one, which matters once you filter orders by date.

```sql
SELECT name, salary FROM employees WHERE salary >= 100000;
```

## Task
Return the `name` and `price` of products that cost more than 50.

## Hint
- Use `WHERE price > 50`.

## Solution
```sql
SELECT name, price FROM products WHERE price > 50;
```
