---
id: price-upsert
title: Price Upsert
chapter: Everyday Postgres
order: 3
difficulty: Medium
check: rows-unordered
---

The restaurant portal allows managers to update prices by uploading menu items. If a dish ID exists, its price must be updated; otherwise, the new dish must be inserted.

## Tables
```text
Table: Menu

+-------------+---------+
| Column Name | Type    |
+-------------+---------+
| dish_id     | int     |
| name        | text    |
| price       | numeric |
+-------------+---------+
```
dish_id is the primary key for this table.

## Task
Write one statement that inserts the dish `dish_id = 101`, `name = 'Paneer Tikka'`, `price = 260.00` into `menu`.
If a dish with that `dish_id` already exists, update its price to the new value instead of failing.
The statement itself must return the affected row's `dish_id`, `name` and `price`.

## Example
```text
Input:
Menu table:
+---------+--------------+--------+
| dish_id | name         | price  |
+---------+--------------+--------+
| 101     | Paneer Tikka | 240.00 |
| 102     | Dal Makhani  | 200.00 |
+---------+--------------+--------+

Output:
+---------+--------------+--------+
| dish_id | name         | price  |
+---------+--------------+--------+
| 101     | Paneer Tikka | 260.00 |
+---------+--------------+--------+

Explanation: Dish 101 already existed with price 240.00, so the statement updated its price to 260.00 and returned the row.
```

## Hint
- `ON CONFLICT` needs to know which column can clash.
- Inside the update part, `EXCLUDED` holds the row you tried to insert.
- `INSERT` can hand back rows just like a `SELECT` does.

## Setup
```sql
CREATE TABLE menu (dish_id INTEGER PRIMARY KEY, name TEXT NOT NULL, price NUMERIC(6,2) NOT NULL);
COMMENT ON TABLE menu IS 'Challenge table: menu';
INSERT INTO menu VALUES (101, 'Paneer Tikka', 240.00), (102, 'Dal Makhani', 200.00);
```

## Solution
```sql
INSERT INTO menu (dish_id, name, price)
VALUES (101, 'Paneer Tikka', 260.00)
ON CONFLICT (dish_id)
DO UPDATE SET price = EXCLUDED.price
RETURNING dish_id, name, price;
```
