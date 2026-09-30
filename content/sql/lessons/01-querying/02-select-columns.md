---
id: select-columns
title: SELECT Specific Columns
chapter: Querying Data
order: 2
dataset: shop
check: rows-unordered
---

List only the columns you need, separated by commas, and the result contains exactly those, in that order.

## Watch it happen
```yaml
tables:
  users:
    columns: [id, name, email, age, country]
    rows:
      - [1, Aarav Mehta, aarav@example.com, 29, India]
      - [2, Sofia Rossi, sofia@example.com, 34, Italy]
      - [3, Liam Carter, liam@example.com, 41, USA]
      - [4, Mei Tanaka, mei@example.com, 26, Japan]
  result:
    columns: [name, country]
    rows:
      - [Aarav Mehta, India]
      - [Sofia Rossi, Italy]
      - [Liam Carter, USA]
      - [Mei Tanaka, Japan]
  result_swapped:
    label: result -- country first
    columns: [country, name]
    rows:
      - [India, Aarav Mehta]
      - [Italy, Sofia Rossi]
      - [USA, Liam Carter]
      - [Japan, Mei Tanaka]
steps:
  - label: Star baseline
    caption: "`SELECT *` hands back every column the table has, all 8 of them, even when you only care about two. Five are shown here to keep the picture small."
    show: [users]
    notes:
      - { title: "every column comes back", text: "Everything, whether you need it or not." }
  - label: Pick two
    caption: "List the columns you want after `SELECT`, separated by commas: `SELECT name, country FROM users`."
    show: [users]
    highlight: [{ table: users, column: name, tone: focus }, { table: users, column: country, tone: focus }]
    notes:
      - { title: "id, email, age stay behind", text: "A column you don't name is simply not in the result.", tone: focus }
  - label: Result
    caption: "The result holds just the two named columns, and still all four rows. Choosing columns never drops a row."
    show: [users, result]
    highlight: [{ table: users, column: name, tone: focus }, { table: users, column: country, tone: focus }, { table: result, row: 1, tone: kept }, { table: result, row: 2, tone: kept }, { table: result, row: 3, tone: kept }, { table: result, row: 4, tone: kept }]
    notes:
      - { title: "4 rows × 2 columns", text: "Same rows, fewer columns.", tone: kept }
  - label: Swap them
    caption: "Columns come back in the order you write them. `SELECT country, name FROM users` puts `country` first."
    show: [result, result_swapped]
    highlight: [{ table: result_swapped, column: country, tone: focus }]
    notes:
      - { title: "you choose the order", text: "The order of columns in the table itself doesn't matter." }
```

## Context
Choosing columns never removes rows; every row still comes back. Picking rows is the job of `WHERE`, which comes later.

```sql
SELECT name, location FROM departments;
```

## Task
Return the `name` and `email` of every user, in that column order.

## Hint
- Separate column names with commas: `SELECT col1, col2 FROM table_name;`

## Solution
```sql
SELECT name, email FROM users;
```
