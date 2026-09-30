---
id: best-paid-department
title: Best-Paid Department
chapter: Aggregation
order: 1
difficulty: Medium
dataset: shop
check: rows-unordered
---

Finance is preparing next quarter's budget and wants to know which single department pays the
highest average salary.

## Task
Return the one department with the highest average salary: its name as `department` and the
average salary, rounded to 2 decimals, as `avg_salary`.

## Example
| department | avg_salary |
|---|---|
| Engineering | 113000.00 |

## Hint
- Start by computing a single average-salary figure per department.
- Once you have one row per department, think about how to keep only the one with the highest
  value.

## Solution
```sql
SELECT d.name AS department, ROUND(AVG(e.salary), 2) AS avg_salary FROM employees AS e JOIN departments AS d ON d.id = e.department_id GROUP BY d.name ORDER BY avg_salary DESC LIMIT 1;
```
