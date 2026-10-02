---
id: top-rated
title: Top Rated
chapter: Warm-up
order: 2
difficulty: Easy
check: rows-ordered
---

The home page showcases the highest-rated dining spots in the city.

## Tables
```text
Table: Restaurants

+-------------+---------+
| Column Name | Type    |
+-------------+---------+
| id          | int     |
| name        | text    |
| rating      | numeric |
+-------------+---------+
```
id is the primary key for this table.
rating is the average customer rating between 0 and 5.

## Task
Write a query to retrieve the top 3 highest-rated restaurants. Return `name` and `rating`, ordered by `rating` descending. Break any ties by `id` ascending.

## Example
```text
Input:
Restaurants table:
+----+--------------+--------+
| id | name         | rating |
+----+--------------+--------+
| 1  | Spice Haven  | 4.8    |
| 2  | Pizza Roma   | 4.2    |
| 3  | Tokyo Bowl   | 4.9    |
| 4  | Burger Shack | 4.5    |
| 5  | Dosa Palace  | 4.7    |
+----+--------------+--------+

Output:
+-------------+--------+
| name        | rating |
+-------------+--------+
| Tokyo Bowl  | 4.9    |
| Spice Haven | 4.8    |
| Dosa Palace | 4.7    |
+-------------+--------+

Explanation: Tokyo Bowl, Spice Haven, and Dosa Palace have the top 3 ratings.
```

## Hint
- Sort descending by rating.
- Limit the total returned rows to 3.

## Setup
```sql
CREATE TABLE restaurants (id INTEGER PRIMARY KEY, name TEXT NOT NULL, rating NUMERIC(2,1) NOT NULL);
COMMENT ON TABLE restaurants IS 'Challenge table: restaurants';
INSERT INTO restaurants VALUES
  (1, 'Spice Haven', 4.8),
  (2, 'Pizza Roma', 4.2),
  (3, 'Tokyo Bowl', 4.9),
  (4, 'Burger Shack', 4.5),
  (5, 'Dosa Palace', 4.7);
```

## Solution
```sql
SELECT name, rating FROM restaurants ORDER BY rating DESC, id LIMIT 3;
```
