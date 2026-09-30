---
id: short-product-names
title: Short Product Names
chapter: SELECT
order: 5
difficulty: Easy
check: rows-unordered
---

A vending-machine company is printing new slot labels that only fit 10 characters, so it needs to know which snacks already fit.

## Tables
```text
Table: Snacks

+-------------+---------+
| Column Name | Type    |
+-------------+---------+
| snack_id    | int     |
| snack_name  | varchar |
+-------------+---------+
```
snack_id is the primary key of this table.
Spaces count as characters.

## Task
Write a query that returns the `snack_id` and `snack_name` of every snack whose name is at most 10 characters long. Return the rows in any order.

## Example
```text
Input:
Snacks table:
+----------+-----------------------+
| snack_id | snack_name            |
+----------+-----------------------+
| 1        | Pretzels              |
| 2        | Sea Salt Crisps       |
| 3        | Trail Mix             |
| 4        | Dark Chocolate Bar    |
| 5        | Rice Cakes            |
| 6        | Honey Roasted Peanuts |
+----------+-----------------------+

Output:
+----------+------------+
| snack_id | snack_name |
+----------+------------+
| 1        | Pretzels   |
| 3        | Trail Mix  |
| 5        | Rice Cakes |
+----------+------------+

Explanation: Pretzels has 8 characters, Trail Mix has 9 and Rice Cakes has exactly 10. Every other name is longer.
```

## Hint
- `LENGTH(text)` counts characters.

## Setup
```sql
CREATE TABLE snacks (snack_id INTEGER PRIMARY KEY, snack_name VARCHAR(50) NOT NULL);
COMMENT ON TABLE snacks IS 'Challenge table: snacks';
INSERT INTO snacks VALUES
  (1, 'Pretzels'),
  (2, 'Sea Salt Crisps'),
  (3, 'Trail Mix'),
  (4, 'Dark Chocolate Bar'),
  (5, 'Rice Cakes'),
  (6, 'Honey Roasted Peanuts');
```

## Solution
```sql
SELECT snack_id, snack_name FROM snacks WHERE LENGTH(snack_name) <= 10;
```
