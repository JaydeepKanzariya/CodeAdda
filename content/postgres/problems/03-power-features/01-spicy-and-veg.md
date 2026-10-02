---
id: spicy-and-veg
title: Spicy and Veg
chapter: Power features
order: 1
difficulty: Hard
check: rows-unordered
---

The app wants to power a curated filter for customers looking for dishes that satisfy multiple distinct dietary tags simultaneously.

## Tables
```text
Table: Menu_items

+-------------+--------+
| Column Name | Type   |
+-------------+--------+
| id          | int    |
| name        | text   |
| tags        | text[] |
+-------------+--------+
```
id is the primary key for this table.
tags is a PostgreSQL native array of text labels.

## Task
Write a query to find all dishes whose `tags` include both `'veg'` and `'spicy'` (other tags may be present too).
Return `id`, `name`, and `tags`. Return the rows in any order.

## Example
```text
Input:
Menu_items table:
+----+---------------+---------------------------+
| id | name          | tags                      |
+----+---------------+---------------------------+
| 1  | Paneer Chilli | {"veg","spicy","chinese"} |
| 2  | Dal Tadka     | {"veg"}                   |
| 3  | Chicken Tikka | {"non-veg","spicy"}       |
| 4  | Masala Corn   | {"veg","spicy"}           |
+----+---------------+---------------------------+

Output:
+----+---------------+---------------------------+
| id | name          | tags                      |
+----+---------------+---------------------------+
| 1  | Paneer Chilli | {"veg","spicy","chinese"} |
| 4  | Masala Corn   | {"veg","spicy"}           |
+----+---------------+---------------------------+

Explanation: Paneer Chilli and Masala Corn are the only dishes whose tags include both 'veg' and 'spicy'.
```

## Hint
- One array can contain another. PostgreSQL has an operator that asks "does the left array hold every element of the right one?"
- An array literal is written as text in curly braces.

## Setup
```sql
CREATE TABLE menu_items (id INTEGER PRIMARY KEY, name TEXT NOT NULL, tags TEXT[] NOT NULL);
COMMENT ON TABLE menu_items IS 'Challenge table: menu_items';
INSERT INTO menu_items VALUES
  (1, 'Paneer Chilli', '{"veg","spicy","chinese"}'),
  (2, 'Dal Tadka', '{"veg"}'),
  (3, 'Chicken Tikka', '{"non-veg","spicy"}'),
  (4, 'Masala Corn', '{"veg","spicy"}');
```

## Solution
```sql
SELECT id, name, tags
FROM menu_items
WHERE tags @> '{"veg", "spicy"}';
```
