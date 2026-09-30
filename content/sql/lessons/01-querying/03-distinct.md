---
id: distinct
title: SELECT with DISTINCT
chapter: Querying Data
order: 3
dataset: shop
check: rows-unordered
---

Many rows repeat the same value, and `SELECT DISTINCT` keeps just one copy of each.

## Context
Many users share a country, so `SELECT country FROM users` repeats values. With several columns, `DISTINCT` removes only rows where all the listed columns match.

```sql
SELECT DISTINCT location FROM departments;
```

## Task
Return each country that appears in `users`, once.

## Hint
- Put `DISTINCT` right after `SELECT`.

## Solution
```sql
SELECT DISTINCT country FROM users;
```
