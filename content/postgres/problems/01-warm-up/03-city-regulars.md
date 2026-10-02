---
id: city-regulars
title: City Regulars
chapter: Warm-up
order: 3
difficulty: Easy
check: rows-unordered
---

The marketing team wants to find cities where customer adoption is highest.

## Tables
```text
Table: Customers

+-------------+------+
| Column Name | Type |
+-------------+------+
| id          | int  |
| name        | text |
| city        | text |
+-------------+------+
```
id is the primary key for this table.
city is the customer's home city.

## Task
Write a query to find all cities that have at least 3 customers. Return `city` and the total number of customers in that city aliased as `customer_count`. Return the rows in any order.

## Example
```text
Input:
Customers table:
+----+--------------+-----------+
| id | name         | city      |
+----+--------------+-----------+
| 1  | Aarav Sharma | Mumbai    |
| 2  | Priya Patel  | Mumbai    |
| 3  | Rohan Gupta  | Mumbai    |
| 4  | Sneha Rao    | Bengaluru |
| 5  | Vikram Nair  | Bengaluru |
| 6  | Ananya Singh | Delhi     |
| 7  | Tanvi Joshi  | Pune      |
| 8  | Aditya Roy   | Pune      |
| 9  | Kavita Verma | Pune      |
+----+--------------+-----------+

Output:
+--------+----------------+
| city   | customer_count |
+--------+----------------+
| Mumbai | 3              |
| Pune   | 3              |
+--------+----------------+

Explanation: Mumbai and Pune have 3 customers each. Bengaluru has 2 and Delhi has 1, so they are left out.
```

## Hint
- Make one group per city and count the rows in each group.
- `WHERE` runs before grouping, so it cannot see a group's count. There is a separate clause for filtering groups.

## Setup
```sql
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL);
COMMENT ON TABLE customers IS 'Challenge table: customers';
INSERT INTO customers VALUES
  (1, 'Aarav Sharma', 'Mumbai'),
  (2, 'Priya Patel', 'Mumbai'),
  (3, 'Rohan Gupta', 'Mumbai'),
  (4, 'Sneha Rao', 'Bengaluru'),
  (5, 'Vikram Nair', 'Bengaluru'),
  (6, 'Ananya Singh', 'Delhi'),
  (7, 'Tanvi Joshi', 'Pune'),
  (8, 'Aditya Roy', 'Pune'),
  (9, 'Kavita Verma', 'Pune');
```

## Solution
```sql
SELECT city, count(*) AS customer_count
FROM customers
GROUP BY city
HAVING count(*) >= 3;
```
