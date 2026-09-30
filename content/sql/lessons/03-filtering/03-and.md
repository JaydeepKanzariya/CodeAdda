---
id: and
title: WHERE with AND
chapter: Filtering Data
order: 3
dataset: shop
check: rows-unordered
---

`AND` joins two conditions, and a row is kept only when both are true.

## Context
You can chain more than two conditions, and every one must hold for the row to survive.

```sql
SELECT name, country FROM suppliers WHERE country = 'USA' AND name LIKE 'N%';
```

## Task
Return the `name` and `price` of products in category `1` that cost less than 100.

## Hint
- Combine two conditions on `category_id` and `price` with `AND`.

## Solution
```sql
SELECT name, price FROM products WHERE category_id = 1 AND price < 100;
```
