---
id: order-desc
title: ORDER BY Descending
chapter: Sorting Data
order: 2
dataset: shop
check: rows-ordered
---

Add `DESC` after a column in `ORDER BY` to sort from largest to smallest, or Z to A.

## Context
`DESC` applies only to the column it follows, so with several sort columns each can have its own direction.

```sql
SELECT name, stock FROM products ORDER BY stock DESC;
```

## Task
Return the `name` and `age` of every user, oldest first.

## Hint
- Use `ORDER BY age DESC` to put the largest values first.

## Solution
```sql
SELECT name, age FROM users ORDER BY age DESC;
```
