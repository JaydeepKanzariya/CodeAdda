---
id: unsold-products
title: Products Nobody Bought
chapter: Basic Joins
order: 2
difficulty: Medium
check: rows-unordered
---

An independent bookshop is deciding which titles to put in the bargain bin and wants the books that have never sold a single copy.

## Tables
```text
Table: Books

+-------------+---------+
| Column Name | Type    |
+-------------+---------+
| book_id     | int     |
| title       | varchar |
+-------------+---------+

Table: Sales

+-------------+------+
| Column Name | Type |
+-------------+------+
| sale_id     | int  |
| book_id     | int  |
| copies      | int  |
+-------------+------+
```
book_id is the primary key of Books.
sale_id is the primary key of Sales. Each row is one sale, and book_id refers to Books.

## Task
Write a query that returns the `title` of every book that does not appear in any row of `sales`. Return the rows in any order.

## Example
```text
Input:
Books table:
+---------+----------------+
| book_id | title          |
+---------+----------------+
| 1       | The Clockmaker |
| 2       | Tides of Glass |
| 3       | Small Engines  |
| 4       | A Map of Ash   |
| 5       | Winter Rooms   |
| 6       | Blue Harvest   |
+---------+----------------+

Sales table:
+---------+---------+--------+
| sale_id | book_id | copies |
+---------+---------+--------+
| 1       | 1       | 2      |
| 2       | 3       | 1      |
| 3       | 1       | 1      |
| 4       | 5       | 4      |
| 5       | 3       | 2      |
+---------+---------+--------+

Output:
+----------------+
| title          |
+----------------+
| Tides of Glass |
| Blue Harvest   |
| A Map of Ash   |
+----------------+

Explanation: Books 1, 3 and 5 appear in Sales. Books 2, 4 and 6 never do.
```

## Hint
- Think in terms of the absence of related rows, rather than counting how many there are.
- A correlated subquery can check, for each book, whether any matching row exists at all.

## Setup
```sql
CREATE TABLE books (book_id INTEGER PRIMARY KEY, title VARCHAR(50) NOT NULL);
CREATE TABLE sales (sale_id INTEGER PRIMARY KEY, book_id INTEGER NOT NULL REFERENCES books (book_id), copies INTEGER NOT NULL);
COMMENT ON TABLE books IS 'Challenge table: books';
COMMENT ON TABLE sales IS 'Challenge table: sales';
INSERT INTO books VALUES
  (1, 'The Clockmaker'),
  (2, 'Tides of Glass'),
  (3, 'Small Engines'),
  (4, 'A Map of Ash'),
  (5, 'Winter Rooms'),
  (6, 'Blue Harvest');
INSERT INTO sales VALUES
  (1, 1, 2),
  (2, 3, 1),
  (3, 1, 1),
  (4, 5, 4),
  (5, 3, 2);
```

## Solution
```sql
SELECT b.title FROM books AS b WHERE NOT EXISTS (SELECT 1 FROM sales AS s WHERE s.book_id = b.book_id);
```
