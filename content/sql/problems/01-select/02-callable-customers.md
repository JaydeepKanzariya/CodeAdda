---
id: callable-customers
title: Customers to Call
chapter: SELECT
order: 2
difficulty: Easy
check: rows-unordered
---

A bookshop is running a feedback-call campaign for younger members of its loyalty club, but it can only call
members who left a phone number.

## Tables
```text
Table: Patrons

+--------------+---------+
| Column Name  | Type    |
+--------------+---------+
| patron_id    | int     |
| full_name    | varchar |
| age          | int     |
| phone_number | varchar |
+--------------+---------+
```
patron_id is the primary key of this table.
phone_number is NULL when the patron did not give a number.

## Task
Write a query that returns the `full_name` and `phone_number` of every patron whose `age` is under 30 and who has a phone number. Return the rows in any order.

## Example
```text
Input:
Patrons table:
+-----------+--------------+-----+--------------+
| patron_id | full_name    | age | phone_number |
+-----------+--------------+-----+--------------+
| 1         | Riya Shah    | 24  | 555-0142     |
| 2         | Tomas Berg   | 41  | 555-0177     |
| 3         | Lena Fischer | 27  | NULL         |
| 4         | Omar Haddad  | 19  | 555-0163     |
| 5         | Grace Liu    | 35  | NULL         |
| 6         | Kenji Mori   | 28  | 555-0190     |
+-----------+--------------+-----+--------------+

Output:
+-------------+--------------+
| full_name   | phone_number |
+-------------+--------------+
| Riya Shah   | 555-0142     |
| Omar Haddad | 555-0163     |
| Kenji Mori  | 555-0190     |
+-------------+--------------+

Explanation: Lena Fischer is under 30 but has no phone number. Tomas Berg and Grace Liu are 30 or older.
```

## Hint
- Combine the age condition and the phone condition with `AND`.
- A missing phone number needs `IS NOT NULL`, not `= NULL`.

## Setup
```sql
CREATE TABLE patrons (patron_id INTEGER PRIMARY KEY, full_name VARCHAR(50) NOT NULL, age INTEGER NOT NULL, phone_number VARCHAR(20));
COMMENT ON TABLE patrons IS 'Challenge table: patrons';
INSERT INTO patrons VALUES
  (1, 'Riya Shah', 24, '555-0142'),
  (2, 'Tomas Berg', 41, '555-0177'),
  (3, 'Lena Fischer', 27, NULL),
  (4, 'Omar Haddad', 19, '555-0163'),
  (5, 'Grace Liu', 35, NULL),
  (6, 'Kenji Mori', 28, '555-0190');
```

## Solution
```sql
SELECT full_name, phone_number FROM patrons WHERE age < 30 AND phone_number IS NOT NULL;
```
