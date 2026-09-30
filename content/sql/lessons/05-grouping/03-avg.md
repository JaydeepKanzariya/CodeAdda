---
id: avg
title: AVG Function
chapter: Grouping Data
order: 3
dataset: shop
check: rows-unordered
---

`AVG` returns the mean of a numeric column, skipping `NULL` values rather than counting them as zero.

## Context
Decimal averages can have many digits, so wrap them in `ROUND(value, n)` to keep the output tidy.

```sql
SELECT ROUND(AVG(salary), 2) AS avg_salary FROM employees;
```

## Task
Return the average product price, rounded to 2 decimal places, as `avg_price`.

## Hint
- Wrap `AVG(price)` in `ROUND(..., 2)`.

## Solution
```sql
SELECT ROUND(AVG(price), 2) AS avg_price FROM products;
```
