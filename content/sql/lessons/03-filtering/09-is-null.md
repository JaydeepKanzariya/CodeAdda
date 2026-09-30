---
id: is-null
title: IS NULL
chapter: Filtering Data
order: 9
dataset: shop
check: rows-unordered
---

`NULL` marks a missing value, and you find it with `IS NULL`, not with `=`.

## Watch it happen
```yaml
tables:
  users:
    columns: [id, name, phone]
    rows:
      - [1, Aarav Mehta, 555-1001]
      - [2, Sofia Rossi, null]
      - [3, Liam Carter, 555-1003]
      - [4, Mei Tanaka, 555-1004]
      - [5, Noah Fischer, null]
  result:
    label: result -- WHERE phone IS NULL
    columns: [id, name]
    rows:
      - [2, Sofia Rossi]
      - [5, Noah Fischer]
steps:
  - label: Missing values
    caption: "Two customers never gave a phone number, so their `phone` is `NULL`. That isn't an empty string or zero. It means unknown."
    show: [users]
    highlight: [{ table: users, cell: [2, phone], tone: focus }, { table: users, cell: [5, phone], tone: focus }]
    notes:
      - { title: "2 of 5 are NULL", text: "NULL marks a value that is missing.", tone: focus }
  - label: "= NULL fails"
    caption: "`WHERE phone = NULL` looks reasonable but returns nothing. Comparing anything with `NULL` gives unknown, never true."
    show: [users]
    highlight: [{ table: users, row: 1, tone: removed }, { table: users, row: 2, tone: removed }, { table: users, row: 3, tone: removed }, { table: users, row: 4, tone: removed }, { table: users, row: 5, tone: removed }]
    notes:
      - { title: "NULL = NULL is unknown", text: "Even two NULLs aren't equal, so WHERE drops every row.", tone: removed }
  - label: IS NULL
    caption: "`IS NULL` is the test built for this job. It is true exactly when the value is missing."
    show: [users]
    highlight: [{ table: users, row: 2, tone: kept }, { table: users, row: 5, tone: kept }]
    dim: [{ table: users, rows: [1, 3, 4] }]
    notes:
      - { title: "2 rows pass", text: "Sofia Rossi and Noah Fischer.", tone: kept }
  - label: Result
    caption: "`SELECT id, name FROM users WHERE phone IS NULL` returns just the customers with no phone on file."
    show: [users, result]
    highlight: [{ table: users, row: 2, tone: kept }, { table: users, row: 5, tone: kept }, { table: result, row: 1, tone: kept }, { table: result, row: 2, tone: kept }]
    dim: [{ table: users, rows: [1, 3, 4] }]
    notes:
      - { title: "5 rows in, 2 rows out", tone: kept }
```

## Context
`phone = NULL` never matches anything, since two unknowns are not considered equal; the result is "unknown", which `WHERE` treats as false.

```sql
SELECT name, description FROM products WHERE description IS NULL;
```

## Task
Return the `name` and `email` of users who have no phone number on file.

## Hint
- `phone = NULL` will not work — use `phone IS NULL` instead.

## Solution
```sql
SELECT name, email FROM users WHERE phone IS NULL;
```
