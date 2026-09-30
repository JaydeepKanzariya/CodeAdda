---
id: delete-using
title: DELETE with JOIN
chapter: Modifying Data
order: 9
dataset: shop
check: state
checkQuery: SELECT id FROM reviews ORDER BY id
---

Delete rows from one table based on data that lives in another, using `USING`.

## Context
`DELETE FROM a USING b WHERE ...` joins `b` in purely for filtering; only rows of `a` are removed. Link the tables in the `WHERE` and add whatever extra condition selects the rows.

## Task
Delete every review written by a customer from the USA.

## Hint
- `DELETE ... USING` lets you join in another table purely to decide which rows to remove.
- Join the two tables the way you would in a `SELECT`, then add the country condition.

## Solution
```sql
DELETE FROM reviews AS r USING users AS u WHERE u.id = r.user_id AND u.country = 'USA';
```
