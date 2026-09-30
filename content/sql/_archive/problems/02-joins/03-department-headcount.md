---
id: department-headcount
title: Department Headcount
chapter: Joins
order: 3
difficulty: Medium
dataset: shop
check: rows-unordered
---

HR is putting together the annual staffing report and needs a headcount for every department —
including any department that currently has nobody assigned to it.

## Task
Return every department's name as `department` together with its number of employees as
`headcount`. Departments with no employees must still appear, with a `headcount` of 0. The order
does not matter.

## Example
| department | headcount |
|---|---|
| Engineering | 3 |
| Sales | 2 |
| Marketing | 1 |
| Support | 2 |
| Finance | 1 |
| Research | 0 |

## Hint
- `LEFT JOIN` from `departments` to `employees` keeps departments that have no staff.
- `COUNT(*)` always counts the row produced by the join, even when nothing actually matched;
  think about what `COUNT` does with a NULL instead.

## Solution
```sql
SELECT d.name AS department, COUNT(e.id) AS headcount FROM departments AS d LEFT JOIN employees AS e ON e.department_id = d.id GROUP BY d.id, d.name;
```
