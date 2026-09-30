---
id: top-three-products
title: Three Priciest Products
chapter: SELECT
order: 3
difficulty: Easy
check: rows-ordered
---

A small art gallery wants to feature its three most expensive paintings on the front window.

## Tables
```text
Table: Paintings

+--------------+---------+
| Column Name  | Type    |
+--------------+---------+
| painting_id  | int     |
| title        | varchar |
| asking_price | decimal |
+--------------+---------+
```
painting_id is the primary key of this table.
No two paintings have the same asking_price.

## Task
Write a query that returns the `title` and `asking_price` of the 3 most expensive paintings, with the most expensive first.

## Example
```text
Input:
Paintings table:
+-------------+----------------+--------------+
| painting_id | title          | asking_price |
+-------------+----------------+--------------+
| 1           | Harbor at Dawn | 1250.00      |
| 2           | Quiet Orchard  | 890.00       |
| 3           | Red Staircase  | 2100.00      |
| 4           | Salt Flats     | 1475.00      |
| 5           | Night Market   | 640.00       |
| 6           | Paper Moons    | 1800.00      |
+-------------+----------------+--------------+

Output:
+---------------+--------------+
| title         | asking_price |
+---------------+--------------+
| Red Staircase | 2100.00      |
| Paper Moons   | 1800.00      |
| Salt Flats    | 1475.00      |
+---------------+--------------+

Explanation: Sorted from the highest price down, these are the first three paintings. The order of the rows matters here.
```

## Hint
- Sort the paintings before cutting the list down.
- `LIMIT` keeps only the first rows that remain after sorting.

## Setup
```sql
CREATE TABLE paintings (painting_id INTEGER PRIMARY KEY, title VARCHAR(50) NOT NULL, asking_price DECIMAL(8, 2) NOT NULL);
COMMENT ON TABLE paintings IS 'Challenge table: paintings';
INSERT INTO paintings VALUES
  (1, 'Harbor at Dawn', 1250.00),
  (2, 'Quiet Orchard', 890.00),
  (3, 'Red Staircase', 2100.00),
  (4, 'Salt Flats', 1475.00),
  (5, 'Night Market', 640.00),
  (6, 'Paper Moons', 1800.00);
```

## Solution
```sql
SELECT title, asking_price FROM paintings ORDER BY asking_price DESC LIMIT 3;
```
