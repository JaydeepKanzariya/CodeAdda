---
id: insert-row
title: INSERT Single Row
chapter: Modifying Data
order: 1
dataset: shop
check: state
checkQuery: SELECT name, description FROM categories ORDER BY id
---

`INSERT` adds a new row: you name the columns and give one value for each.

## Watch it happen
```yaml
tables:
  before:
    label: users -- last 3 rows
    columns: [id, name, email, signup_date]
    rows:
      - [13, Rohan Gupta, rohan@example.com, 2023-09-02]
      - [14, Ava Thompson, ava@example.com, 2023-10-21]
      - [15, Mateo Lopez, mateo@example.com, 2023-11-11]
  after:
    label: users -- after insert
    columns: [id, name, email, signup_date]
    rows:
      - [13, Rohan Gupta, rohan@example.com, 2023-09-02]
      - [14, Ava Thompson, ava@example.com, 2023-10-21]
      - [15, Mateo Lopez, mateo@example.com, 2023-11-11]
      - [16, Zara Ali, zara@example.com, 2024-05-02]
steps:
  - label: Before
    caption: "The last three customers in `users`. The newest has `id` 15."
    show: [before]
    notes:
      - { title: "15 customers so far", text: "Only the last three are shown." }
  - label: The new row
    caption: "`INSERT INTO users (name, email, signup_date) VALUES ('Zara Ali', 'zara@example.com', '2024-05-02')` adds one row. Each value goes to the column in the same position."
    show: [after]
    highlight: [{ table: after, row: 4, tone: kept }]
    notes:
      - { title: "3 columns, 3 values", text: "First value to first column, and so on.", tone: kept }
  - label: Defaults
    caption: "We never gave an `id`. The column is `SERIAL`, so Postgres picked the next number for us. Leftover columns like `phone` become `NULL`."
    show: [after]
    highlight: [{ table: after, row: 4, tone: kept }, { table: after, cell: [4, id], tone: focus }]
    notes:
      - { title: "SERIAL fills id", text: "15 was taken, so the new row gets 16.", tone: focus }
      - { title: "the rest are NULL", text: "phone, age, country and city were left out." }
  - label: Verify with SELECT
    caption: "`INSERT` only reports how many rows it added. Run `SELECT * FROM users WHERE email = 'zara@example.com'` to see the row for yourself."
    show: [after]
    highlight: [{ table: after, row: 4, tone: kept }]
    dim: [{ table: after, rows: [1, 2, 3] }]
    notes:
      - { title: "INSERT 0 1", text: "Postgres's reply: one row inserted.", tone: kept }
```

## Context
`INSERT INTO table (col1, col2) VALUES (val1, val2)` matches values to columns by position. Columns you leave out get their default, or `NULL`. This chapter changes data; press **Reset DB** any time to restore the original `shop` rows.

## Task
Add a category named "Music" with the description "Instruments and audio gear".

## Hint
- Name the columns you're filling in, then give one value per column in the same order.
- Text values need to be wrapped in single quotes.

## Solution
```sql
INSERT INTO categories (name, description) VALUES ('Music', 'Instruments and audio gear');
```
