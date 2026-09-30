---
id: not-in
title: NOT IN Operator
chapter: Filtering Data
order: 6
dataset: shop
check: rows-unordered
---

`NOT IN` keeps rows whose value is not in the given list.

## Context
Beware of `NULL`: if the list or the column can hold one, `NOT IN` may behave unexpectedly, because comparing anything to `NULL` is never true.

```sql
SELECT name, country FROM suppliers WHERE country NOT IN ('India', 'Japan');
```

## Task
Return the `name` and `category_id` of products that are not in category `1` or category `2`.

## Hint
- Use `WHERE category_id NOT IN (...)` with both category ids in the list.

## Solution
```sql
SELECT name, category_id FROM products WHERE category_id NOT IN (1, 2);
```
