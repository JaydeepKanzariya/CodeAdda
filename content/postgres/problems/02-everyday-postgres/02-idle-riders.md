---
id: idle-riders
title: Idle Riders
chapter: Everyday Postgres
order: 2
difficulty: Medium
check: rows-unordered
---

Fleet operations wants to contact riders who have registered on the platform but have not yet been assigned any delivery orders.

## Tables
```text
Table: Riders

+-------------+------+
| Column Name | Type |
+-------------+------+
| id          | int  |
| name        | text |
+-------------+------+

Table: Orders

+-------------+------+
| Column Name | Type |
+-------------+------+
| id          | int  |
| rider_id    | int  |
| status      | text |
+-------------+------+
```
id is the primary key for both tables.
rider_id in Orders refers to Riders.id.

## Task
Write a query to find all riders who have never delivered or been assigned an order.
Return `rider_id` (the rider's `id`) and `name`. Return the rows in any order.

## Example
```text
Input:
Riders table:
+----+---------------+
| id | name          |
+----+---------------+
| 1  | Rajesh Kumar  |
| 2  | Sunil Verma   |
| 3  | Amit Shinde   |
| 4  | Praveen Yadav |
+----+---------------+

Orders table:
+----+----------+-----------+
| id | rider_id | status    |
+----+----------+-----------+
| 10 | 1        | delivered |
| 11 | 1        | delivered |
| 12 | 3        | delivered |
+----+----------+-----------+

Output:
+----------+---------------+
| rider_id | name          |
+----------+---------------+
| 2        | Sunil Verma   |
| 4        | Praveen Yadav |
+----------+---------------+

Explanation: Rajesh has orders 10 and 11 and Amit has order 12. Sunil and Praveen never appear in the orders table.
```

## Hint
- Keep every rider, even the ones with no matching order. An inner join would drop exactly the riders you want.
- Think about which columns are empty on a rider row that found no order.

## Setup
```sql
CREATE TABLE riders (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE orders (id INTEGER PRIMARY KEY, rider_id INTEGER REFERENCES riders(id), status TEXT NOT NULL);
COMMENT ON TABLE riders IS 'Challenge table: riders';
COMMENT ON TABLE orders IS 'Challenge table: orders';
INSERT INTO riders VALUES (1, 'Rajesh Kumar'), (2, 'Sunil Verma'), (3, 'Amit Shinde'), (4, 'Praveen Yadav');
INSERT INTO orders VALUES (10, 1, 'delivered'), (11, 1, 'delivered'), (12, 3, 'delivered');
```

## Solution
```sql
SELECT r.id AS rider_id, r.name
FROM riders r
LEFT JOIN orders o ON r.id = o.rider_id
WHERE o.id IS NULL;
```
