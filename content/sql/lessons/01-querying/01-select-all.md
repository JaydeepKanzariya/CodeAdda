---
id: select-all
title: SELECT All Columns
chapter: Querying Data
order: 1
dataset: shop
check: rows-unordered
---

Your first query reads a whole table at once with `SELECT *`. We'll try it on `users`, the store's list of shoppers.

## Watch it happen
```yaml
tables:
  users:
    columns: [id, name, age, country]
    rows:
      - [1, Aarav Mehta, 29, India]
      - [2, Sofia Rossi, 34, Italy]
      - [3, Liam Carter, 41, USA]
      - [4, Mei Tanaka, 26, Japan]
steps:
  - label: The grid
    caption: Here are four shoppers from `users`. Postgres keeps them in a grid, with headings along the top.
    notes:
      - { title: "4 × 4 = 16 cells", text: "Each value sits where one line meets one heading." }
  - label: One shopper
    caption: Read across a single line and you get a **row**. Sofia Rossi's id, name, age and country travel together.
    highlight: [{ table: users, row: 2, tone: focus }]
    notes:
      - { title: "row = record", text: "Later lessons filter, add and count these." }
  - label: One heading
    caption: Read down under a single heading and you get a **column**. Every entry under `age` is a whole number, since a column stores only one kind of value.
    highlight: [{ table: users, column: age, tone: focus }]
    notes:
      - { title: "column = field", text: "Same heading, same type, down the whole grid." }
  - label: The star
    caption: "In `SELECT * FROM users` the star stands for every heading. Nothing gets filtered or reordered, so all four lines come back as they are."
    highlight: [{ table: users, row: 1, tone: kept }, { table: users, row: 2, tone: kept }, { table: users, row: 3, tone: kept }, { table: users, row: 4, tone: kept }]
    notes:
      - { title: "4 in, 4 out", text: "The output mirrors the grid exactly.", tone: kept }
  - label: Beyond peeking
    caption: "The star is a quick way to peek at a table. Production queries spell out their columns, so a column added next month can't sneak into the output."
    notes:
      - { title: "a habit worth building", text: "Write out the column names you rely on.", tone: focus }
```

## Context
`SELECT` names the columns you want and `FROM` names the table. `*` is shorthand for "all columns", handy while exploring an unfamiliar table. In real code, list the columns you need so the query survives someone adding a column later.

## Task
Return every column and every row from the `users` table.

## Hint
- The pattern is `SELECT * FROM table_name;`

## Solution
```sql
SELECT * FROM users;
```
