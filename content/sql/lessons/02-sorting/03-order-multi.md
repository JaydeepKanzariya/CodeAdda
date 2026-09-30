---
id: order-multi
title: ORDER BY Multiple Columns
chapter: Sorting Data
order: 3
dataset: shop
check: rows-ordered
---

`ORDER BY` accepts a comma-separated list of columns, and later columns break ties in earlier ones.

## Context
Rows sort by the first column; rows that tie are ordered by the second, and so on. Each column may carry its own `ASC` or `DESC`.

```sql
SELECT name, department_id, salary FROM employees ORDER BY department_id ASC, salary DESC;
```

## Task
Return the `name`, `country`, and `age` of every user, sorted with countries A to Z, and within
each country the oldest user first.

## Hint
- List two columns after `ORDER BY`, separated by a comma.
- The country needs ascending order; age needs descending order.

## Solution
```sql
SELECT name, country, age FROM users ORDER BY country ASC, age DESC;
```
