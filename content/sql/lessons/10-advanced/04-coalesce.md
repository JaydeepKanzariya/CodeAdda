---
id: coalesce
title: COALESCE Function
chapter: Advanced Topics
order: 4
dataset: shop
check: rows-unordered
---

`COALESCE` returns the first argument that is not `NULL`.

## Context
With two arguments it means "use this, or fall back to that". More arguments chain further fallbacks in order of preference. It is the usual way to give `NULL` values a readable display.

## Task
Return every user's `name` and `phone`, showing 'no phone' instead of `NULL` where a phone
number is missing.

## Hint
- `COALESCE` takes the column and a fallback value, and returns whichever one isn't `NULL`.
- Alias the result back to the original column name.

## Solution
```sql
SELECT name, COALESCE(phone, 'no phone') AS phone FROM users;
```
