---
id: recursive-cte
title: Recursive CTE
chapter: Common Table Expressions
order: 4
dataset: shop
check: rows-unordered
---

`WITH RECURSIVE` lets a CTE refer to itself, which is how you walk a hierarchy of any depth.

## Context
A recursive CTE has an anchor query and a recursive query joined by `UNION ALL`. Postgres keeps re-running the recursive part on the previous round of rows until it returns nothing new. Make sure the recursion eventually runs out of rows; this lab stops any query that runs longer than 5 seconds.

## Task
Starting from Kavya Rao (`id` 1), return everyone in her reporting chain, including herself, as
`name` and `level` (Kavya is level 1, her direct reports are level 2, and so on).

## Hint
- The anchor picks the one starting employee and gives them a starting level number.
- The recursive part joins `employees` back to the CTE through the manager relationship, one
  level deeper each time.

## Solution
```sql
WITH RECURSIVE team AS (SELECT id, name, 1 AS level FROM employees WHERE id = 1 UNION ALL SELECT e.id, e.name, t.level + 1 FROM employees AS e JOIN team AS t ON e.manager_id = t.id) SELECT name, level FROM team;
```
