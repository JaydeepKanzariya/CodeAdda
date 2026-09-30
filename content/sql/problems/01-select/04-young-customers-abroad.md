---
id: young-customers-abroad
title: Young Customers Abroad
chapter: SELECT
order: 4
difficulty: Easy
check: rows-unordered
---

A travel-gear brand is planning a student campaign outside the USA and needs its audience.

## Tables
```text
Table: Clients

+-------------+---------+
| Column Name | Type    |
+-------------+---------+
| client_id   | int     |
| client_name | varchar |
| age         | int     |
| country     | varchar |
+-------------+---------+
```
client_id is the primary key of this table.
age is NULL when the client did not give their age.

## Task
Write a query that returns the `client_name` and `country` of every client younger than 30 who does not live in the USA. Clients with no recorded age are not included. Return the rows in any order.

## Example
```text
Input:
Clients table:
+-----------+--------------+------+---------+
| client_id | client_name  | age  | country |
+-----------+--------------+------+---------+
| 1         | Sofia Rossi  | 22   | Italy   |
| 2         | Jake Turner  | 25   | USA     |
| 3         | Priya Nair   | NULL | India   |
| 4         | Lucas Moreau | 29   | France  |
| 5         | Emma Clark   | 34   | Canada  |
| 6         | Diego Ramos  | 27   | Mexico  |
| 7         | Noah Bennett | NULL | USA     |
+-----------+--------------+------+---------+

Output:
+--------------+---------+
| client_name  | country |
+--------------+---------+
| Sofia Rossi  | Italy   |
| Lucas Moreau | France  |
| Diego Ramos  | Mexico  |
+--------------+---------+

Explanation: Jake Turner lives in the USA, Emma Clark is 34, and Priya Nair has no recorded age.
```

## Hint
- Combine two conditions with `AND`.
- `age < 30` is never true when `age` is `NULL`.

## Setup
```sql
CREATE TABLE clients (client_id INTEGER PRIMARY KEY, client_name VARCHAR(50) NOT NULL, age INTEGER, country VARCHAR(30) NOT NULL);
COMMENT ON TABLE clients IS 'Challenge table: clients';
INSERT INTO clients VALUES
  (1, 'Sofia Rossi', 22, 'Italy'),
  (2, 'Jake Turner', 25, 'USA'),
  (3, 'Priya Nair', NULL, 'India'),
  (4, 'Lucas Moreau', 29, 'France'),
  (5, 'Emma Clark', 34, 'Canada'),
  (6, 'Diego Ramos', 27, 'Mexico'),
  (7, 'Noah Bennett', NULL, 'USA');
```

## Solution
```sql
SELECT client_name, country FROM clients WHERE age < 30 AND country <> 'USA';
```
