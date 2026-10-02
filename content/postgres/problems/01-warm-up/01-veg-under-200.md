---
id: veg-under-200
title: Veg Under 200
chapter: Warm-up
order: 1
difficulty: Easy
check: rows-unordered
---

The app wants to display an affordable vegetarian menu section for budget-conscious diners.

## Tables
```text
Table: Dishes

+-------------+---------+
| Column Name | Type    |
+-------------+---------+
| id          | int     |
| name        | text    |
| price       | numeric |
| is_veg      | boolean |
+-------------+---------+
```
id is the primary key for this table.
is_veg indicates whether the dish is vegetarian.

## Task
Write a query that returns the `name` and `price` of all vegetarian dishes that cost less than 200. Return the rows in any order.

## Example
```text
Input:
Dishes table:
+----+---------------+--------+--------+
| id | name          | price  | is_veg |
+----+---------------+--------+--------+
| 1  | Paneer Tikka  | 240.00 | true   |
| 2  | Dal Tadka     | 180.00 | true   |
| 3  | Butter Naan   | 50.00  | true   |
| 4  | Chicken Curry | 320.00 | false  |
| 5  | Aloo Paratha  | 90.00  | true   |
+----+---------------+--------+--------+

Output:
+--------------+--------+
| name         | price  |
+--------------+--------+
| Dal Tadka    | 180.00 |
| Butter Naan  | 50.00  |
| Aloo Paratha | 90.00  |
+--------------+--------+

Explanation: Dal Tadka, Butter Naan and Aloo Paratha are vegetarian and cost under 200. Paneer Tikka is vegetarian but costs 240.00, and Chicken Curry is not vegetarian.
```

## Hint
- A row must pass two conditions at once.
- `is_veg` is already true or false, so it can be a condition on its own.

## Setup
```sql
CREATE TABLE dishes (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price NUMERIC(6,2) NOT NULL, is_veg BOOLEAN NOT NULL);
COMMENT ON TABLE dishes IS 'Challenge table: dishes';
INSERT INTO dishes VALUES
  (1, 'Paneer Tikka', 240.00, true),
  (2, 'Dal Tadka', 180.00, true),
  (3, 'Butter Naan', 50.00, true),
  (4, 'Chicken Curry', 320.00, false),
  (5, 'Aloo Paratha', 90.00, true);
```

## Solution
```sql
SELECT name, price FROM dishes WHERE is_veg AND price < 200;
```
