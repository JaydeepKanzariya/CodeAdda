---
id: busy-managers
title: Busy Managers
chapter: Easy Challenges
order: 1
difficulty: Medium
check: rows-unordered
---

A clinic's HR team wants to check which supervisors are responsible for more than one person.

## Tables
```text
Table: Staff

+---------------+---------+
| Column Name   | Type    |
+---------------+---------+
| staff_id      | int     |
| staff_name    | varchar |
| supervisor_id | int     |
+---------------+---------+
```
staff_id is the primary key of this table.
supervisor_id is the staff_id of the person's direct supervisor, or NULL for the person at the top.

## Task
Write a query that returns the `staff_name` of every staff member who has at least 2 direct reports: people whose `supervisor_id` is their `staff_id`. Return the rows in any order.

## Example
```text
Input:
Staff table:
+----------+------------+---------------+
| staff_id | staff_name | supervisor_id |
+----------+------------+---------------+
| 1        | Kavya Rao  | NULL          |
| 2        | Arjun Das  | 1             |
| 3        | Maya Singh | 1             |
| 4        | Leo Park   | 2             |
| 5        | Nina Costa | 2             |
| 6        | Omar Faris | 2             |
| 7        | Iris Chen  | 3             |
| 8        | Ravi Patel | 7             |
+----------+------------+---------------+

Output:
+------------+
| staff_name |
+------------+
| Kavya Rao  |
| Arjun Das  |
+------------+

Explanation: Kavya Rao supervises 2 people and Arjun Das supervises 3. Maya Singh and Iris Chen supervise only one person each.
```

## Hint
- Group the staff by `supervisor_id` and keep groups with `COUNT(*) >= 2`.
- Join `staff` to itself to get the supervisor's name.

## Setup
```sql
CREATE TABLE staff (staff_id INTEGER PRIMARY KEY, staff_name VARCHAR(50) NOT NULL, supervisor_id INTEGER REFERENCES staff (staff_id));
COMMENT ON TABLE staff IS 'Challenge table: staff';
INSERT INTO staff VALUES
  (1, 'Kavya Rao', NULL),
  (2, 'Arjun Das', 1),
  (3, 'Maya Singh', 1),
  (4, 'Leo Park', 2),
  (5, 'Nina Costa', 2),
  (6, 'Omar Faris', 2),
  (7, 'Iris Chen', 3),
  (8, 'Ravi Patel', 7);
```

## Solution
```sql
SELECT s.staff_name
FROM staff AS r JOIN staff AS s ON s.staff_id = r.supervisor_id
GROUP BY s.staff_id, s.staff_name
HAVING COUNT(*) >= 2;
```
