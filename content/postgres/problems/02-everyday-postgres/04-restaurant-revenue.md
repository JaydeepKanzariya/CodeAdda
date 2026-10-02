---
id: restaurant-revenue
title: Restaurant Revenue
chapter: Everyday Postgres
order: 4
difficulty: Medium
check: rows-unordered
---

Finance requires a breakdown of completed net sales per restaurant partner, ignoring orders that were cancelled or remain unfulfilled.

## Tables
```text
Table: Restaurants

+-------------+------+
| Column Name | Type |
+-------------+------+
| id          | int  |
| name        | text |
+-------------+------+

Table: Orders

+---------------+---------+
| Column Name   | Type    |
+---------------+---------+
| id            | int     |
| restaurant_id | int     |
| total         | numeric |
| status        | text    |
+---------------+---------+
```
id is the primary key for both tables.
restaurant_id refers to Restaurants.id.
status is 'delivered', 'cancelled', or 'placed'.

## Task
Write a query that returns, for every restaurant that has at least one order, its name as `restaurant_name` and its delivered revenue as `revenue`.
Delivered revenue is the sum of `total` over that restaurant's orders with status `'delivered'`. A restaurant with orders but no delivered ones must show `0`, not `NULL`. Return the rows in any order.

## Example
```text
Input:
Restaurants table:
+----+-------------+
| id | name        |
+----+-------------+
| 1  | Spice Haven |
| 2  | Pizza Roma  |
| 3  | Taco Town   |
+----+-------------+

Orders table:
+----+---------------+--------+-----------+
| id | restaurant_id | total  | status    |
+----+---------------+--------+-----------+
| 10 | 1             | 500.00 | delivered |
| 11 | 1             | 300.00 | cancelled |
| 12 | 2             | 400.00 | delivered |
| 13 | 2             | 250.00 | delivered |
| 14 | 3             | 200.00 | cancelled |
+----+---------------+--------+-----------+

Output:
+-----------------+---------+
| restaurant_name | revenue |
+-----------------+---------+
| Spice Haven     | 500.00  |
| Pizza Roma      | 650.00  |
| Taco Town       | 0       |
+-----------------+---------+

Explanation: Spice Haven's cancelled 300.00 order is excluded. Pizza Roma earned 400.00 + 250.00 = 650.00. Taco Town's only order was cancelled, so its revenue is 0.
```

## Hint
- Filtering cancelled orders out in `WHERE` would make Taco Town disappear. Let the aggregate itself decide which rows to add up.
- A sum over no rows is `NULL`; there is a function that swaps `NULL` for a fallback value.

## Setup
```sql
CREATE TABLE restaurants (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE orders (id INTEGER PRIMARY KEY, restaurant_id INTEGER REFERENCES restaurants(id), total NUMERIC(6,2) NOT NULL, status TEXT NOT NULL);
COMMENT ON TABLE restaurants IS 'Challenge table: restaurants';
COMMENT ON TABLE orders IS 'Challenge table: orders';
INSERT INTO restaurants VALUES (1, 'Spice Haven'), (2, 'Pizza Roma'), (3, 'Taco Town');
INSERT INTO orders VALUES
  (10, 1, 500.00, 'delivered'),
  (11, 1, 300.00, 'cancelled'),
  (12, 2, 400.00, 'delivered'),
  (13, 2, 250.00, 'delivered'),
  (14, 3, 200.00, 'cancelled');
```

## Solution
```sql
SELECT
  r.name AS restaurant_name,
  COALESCE(sum(o.total) FILTER (WHERE o.status = 'delivered'), 0) AS revenue
FROM restaurants r
JOIN orders o ON r.id = o.restaurant_id
GROUP BY r.name;
```
