---
id: payment-split
title: Payment Split
chapter: Power features
order: 2
difficulty: Hard
check: rows-unordered
---

The payments reconciliation team needs an aggregate breakdown of transaction volumes and revenue grouped by payment gateway method stored inside JSONB metadata.

## Tables
```text
Table: Orders

+-------------+---------+
| Column Name | Type    |
+-------------+---------+
| id          | int     |
| total       | numeric |
| details     | jsonb   |
+-------------+---------+
```
id is the primary key for this table.
details is a JSONB document containing nested `payment` object with key `method` ('upi', 'card', 'cash').

## Task
Write a query that returns one row per payment method found in `details`, with:
- `method`: the payment method as text
- `order_count`: the number of orders paid that way
- `total_amount`: the sum of `total` for those orders

Ignore orders that have no payment method. Return the rows in any order.

## Example
```text
Input:
Orders table:
+----+--------+---------------------------------+
| id | total  | details                         |
+----+--------+---------------------------------+
| 1  | 400.00 | {"payment": {"method": "upi"}}  |
| 2  | 600.00 | {"payment": {"method": "card"}} |
| 3  | 250.00 | {"payment": {"method": "upi"}}  |
| 4  | 500.00 | {"payment": {"method": "cash"}} |
+----+--------+---------------------------------+

Output:
+--------+-------------+--------------+
| method | order_count | total_amount |
+--------+-------------+--------------+
| upi    | 2           | 650.00       |
| card   | 1           | 600.00       |
| cash   | 1           | 500.00       |
+--------+-------------+--------------+

Explanation: UPI paid for 2 orders totalling 400.00 + 250.00 = 650.00; card and cash paid for one order each.
```

## Hint
- `->` steps into a JSON object and keeps JSON; `->>` steps in and gives back text.
- Group by the same expression you select for the method.

## Setup
```sql
CREATE TABLE orders (id INTEGER PRIMARY KEY, total NUMERIC(6,2) NOT NULL, details JSONB NOT NULL);
COMMENT ON TABLE orders IS 'Challenge table: orders';
INSERT INTO orders VALUES
  (1, 400.00, '{"payment": {"method": "upi"}}'),
  (2, 600.00, '{"payment": {"method": "card"}}'),
  (3, 250.00, '{"payment": {"method": "upi"}}'),
  (4, 500.00, '{"payment": {"method": "cash"}}');
```

## Solution
```sql
SELECT
  details->'payment'->>'method' AS method,
  count(*) AS order_count,
  sum(total) AS total_amount
FROM orders
WHERE details->'payment'->>'method' IS NOT NULL
GROUP BY details->'payment'->>'method';
```
