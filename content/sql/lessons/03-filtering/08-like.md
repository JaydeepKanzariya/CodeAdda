---
id: like
title: LIKE Pattern Matching
chapter: Filtering Data
order: 8
dataset: shop
check: rows-unordered
---

`LIKE` matches text against a pattern rather than an exact value.

## Context
`%` stands for any run of characters (even none) and `_` for exactly one. Put `%` at the end for a prefix, at the start for a suffix, or on both sides for "contains".

```sql
SELECT name FROM categories WHERE name LIKE '%Home%';
```

## Task
Return the `name` and `email` of users whose name starts with "A".

## Hint
- Use `LIKE 'A%'` — the `%` allows anything after the "A".

## Solution
```sql
SELECT name, email FROM users WHERE name LIKE 'A%';
```
