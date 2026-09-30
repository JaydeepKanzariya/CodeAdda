---
id: customers-without-orders
title: Customers Who Never Ordered
chapter: Basic Joins
order: 1
difficulty: Easy
check: rows-unordered
---

A grocery app wants to send a first-purchase discount code to shoppers who signed up but have never checked out a basket.

## Tables
```text
Table: Shoppers

+--------------+---------+
| Column Name  | Type    |
+--------------+---------+
| shopper_id   | int     |
| shopper_name | varchar |
+--------------+---------+

Table: Baskets

+---------------+------+
| Column Name   | Type |
+---------------+------+
| basket_id     | int  |
| shopper_id    | int  |
| checkout_date | date |
+---------------+------+
```
shopper_id is the primary key of Shoppers.
basket_id is the primary key of Baskets. Each row is one checked-out basket, and shopper_id refers to Shoppers.

## Task
Write a query that returns the `shopper_name` of every shopper who has no basket at all. Return the rows in any order.

## Example
```text
Input:
Shoppers table:
+------------+--------------+
| shopper_id | shopper_name |
+------------+--------------+
| 1          | Ana Lima     |
| 2          | Ben Okafor   |
| 3          | Chen Wei     |
| 4          | Dara Quinn   |
| 5          | Eli Novak    |
| 6          | Farah Aziz   |
+------------+--------------+

Baskets table:
+-----------+------------+---------------+
| basket_id | shopper_id | checkout_date |
+-----------+------------+---------------+
| 101       | 1          | 2026-09-02    |
| 102       | 3          | 2026-09-05    |
| 103       | 1          | 2026-09-11    |
| 104       | 5          | 2026-09-14    |
| 105       | 3          | 2026-09-20    |
+-----------+------------+---------------+

Output:
+--------------+
| shopper_name |
+--------------+
| Ben Okafor   |
| Farah Aziz   |
| Dara Quinn   |
+--------------+

Explanation: Ana Lima, Chen Wei and Eli Novak each have at least one basket. The other three have none.
```

## Hint
- A `LEFT JOIN` from `shoppers` to `baskets` keeps every shopper, even those with no matching basket.
- When a shopper has no match, the row is still kept, but every column that comes from `baskets`
  holds NULL — think about how to spot those rows in the `WHERE` clause.

## Setup
```sql
CREATE TABLE shoppers (shopper_id INTEGER PRIMARY KEY, shopper_name VARCHAR(50) NOT NULL);
CREATE TABLE baskets (basket_id INTEGER PRIMARY KEY, shopper_id INTEGER NOT NULL REFERENCES shoppers (shopper_id), checkout_date DATE NOT NULL);
COMMENT ON TABLE shoppers IS 'Challenge table: shoppers';
COMMENT ON TABLE baskets IS 'Challenge table: baskets';
INSERT INTO shoppers VALUES
  (1, 'Ana Lima'),
  (2, 'Ben Okafor'),
  (3, 'Chen Wei'),
  (4, 'Dara Quinn'),
  (5, 'Eli Novak'),
  (6, 'Farah Aziz');
INSERT INTO baskets VALUES
  (101, 1, '2026-09-02'),
  (102, 3, '2026-09-05'),
  (103, 1, '2026-09-11'),
  (104, 5, '2026-09-14'),
  (105, 3, '2026-09-20');
```

## Solution
```sql
SELECT s.shopper_name FROM shoppers AS s LEFT JOIN baskets AS b ON b.shopper_id = s.shopper_id WHERE b.basket_id IS NULL;
```
