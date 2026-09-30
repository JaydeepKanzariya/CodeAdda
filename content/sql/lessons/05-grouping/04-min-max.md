---
id: min-max
title: MIN and MAX Functions
chapter: Grouping Data
order: 4
dataset: shop
check: rows-unordered
---

`MIN` and `MAX` return the smallest and largest value in a column.

## Context
They work on numbers, dates and text (for text, "largest" means latest alphabetically), ignore `NULL`, and can be selected side by side.

```sql
SELECT MIN(hire_date) AS earliest_hire, MAX(hire_date) AS latest_hire FROM employees;
```

## Task
Return the lowest product price as `cheapest` and the highest as `priciest`.

## Hint
- Select `MIN(price)` and `MAX(price)` together, each with its own alias.

## Solution
```sql
SELECT MIN(price) AS cheapest, MAX(price) AS priciest FROM products;
```
