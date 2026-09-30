---
id: where
title: WHERE Clause
chapter: Filtering Data
order: 1
dataset: shop
check: rows-unordered
---

`WHERE` keeps only the rows for which a condition is true. It sits right after `FROM`.

## Watch it happen
```yaml
tables:
  users:
    columns: [name, country]
    rows:
      - [Aarav Mehta, India]
      - [Liam Carter, USA]
      - [Mei Tanaka, Japan]
      - [Ethan Brooks, USA]
      - [Hana Kim, Japan]
  result:
    label: result -- WHERE country = 'USA'
    columns: [name, country]
    rows:
      - [Liam Carter, USA]
      - [Ethan Brooks, USA]
steps:
  - label: The question
    caption: "We only want customers from the USA. The condition `country = 'USA'` looks at one column: `country`."
    show: [users]
    highlight: [{ table: users, column: country, tone: focus }]
    notes:
      - { title: "one test per row", text: "Each row either passes the condition or it doesn't.", tone: focus }
  - label: Test each row
    caption: "`WHERE` checks the condition row by row. Two rows say `USA` and pass; the other three fail."
    show: [users]
    highlight: [{ table: users, row: 1, tone: removed }, { table: users, row: 2, tone: kept }, { table: users, row: 3, tone: removed }, { table: users, row: 4, tone: kept }, { table: users, row: 5, tone: removed }]
    notes:
      - { title: "2 pass, 3 fail", text: "Only true counts. Every other row is dropped." }
  - label: Only matches
    caption: "The result holds only the rows that passed. The columns are exactly the same as before."
    show: [users, result]
    highlight: [{ table: users, row: 2, tone: kept }, { table: users, row: 4, tone: kept }, { table: result, row: 1, tone: kept }, { table: result, row: 2, tone: kept }]
    dim: [{ table: users, rows: [1, 3, 5] }]
    notes:
      - { title: "5 rows in, 2 rows out", tone: kept }
  - label: WHERE vs SELECT
    caption: "`WHERE` decides which **rows** you get, and the `SELECT` list decides which **columns**. Most queries use both."
    show: [result]
    highlight: [{ table: result, row: 1, tone: kept }, { table: result, row: 2, tone: kept }]
    notes:
      - { title: "WHERE picks rows", text: "It filters top to bottom." }
      - { title: "SELECT picks columns", text: "It trims left to right." }
```

## Context
Text values go in single quotes, and matching is exact and case-sensitive by default, so `'mumbai'` will not match `'Mumbai'`.

```sql
SELECT * FROM departments WHERE location = 'Mumbai';
```

## Task
Return every column of the users who live in India.

## Hint
- Add `WHERE country = 'India'` after the table name.

## Solution
```sql
SELECT * FROM users WHERE country = 'India';
```
