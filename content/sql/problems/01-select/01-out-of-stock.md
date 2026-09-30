---
id: out-of-stock
title: Out of Stock
chapter: SELECT
order: 1
difficulty: Easy
check: rows-unordered
---

The warehouse team is planning this week's restock and needs every product that has run out completely.

## Tables
```text
Table: Items

+-------------+---------+
| Column Name | Type    |
+-------------+---------+
| item_id     | int     |
| item_name   | varchar |
| on_hand     | int     |
+-------------+---------+
```
item_id is the primary key of this table.
on_hand is the number of units currently in the warehouse.

## Task
Write a query that returns the `item_name` of every item whose `on_hand` is 0. Return the rows in any order.

## Example
```text
Input:
Items table:
+---------+--------------+---------+
| item_id | item_name    | on_hand |
+---------+--------------+---------+
| 1       | Desk Lamp    | 12      |
| 2       | Smart Watch  | 0       |
| 3       | Yoga Mat     | 7       |
| 4       | French Press | 0       |
| 5       | USB-C Hub    | 3       |
+---------+--------------+---------+

Output:
+--------------+
| item_name    |
+--------------+
| Smart Watch  |
| French Press |
+--------------+

Explanation: Only Smart Watch and French Press have no units left.
```

## Hint
- Filter the rows with `WHERE on_hand = 0`.

## Setup
```sql
CREATE TABLE items (item_id INTEGER PRIMARY KEY, item_name VARCHAR(50) NOT NULL, on_hand INTEGER NOT NULL);
COMMENT ON TABLE items IS 'Challenge table: items';
INSERT INTO items VALUES (1, 'Desk Lamp', 12), (2, 'Smart Watch', 0), (3, 'Yoga Mat', 7), (4, 'French Press', 0), (5, 'USB-C Hub', 3);
```

## Solution
```sql
SELECT item_name FROM items WHERE on_hand = 0;
```
