---
id: order-asc
title: ORDER BY Ascending
chapter: Sorting Data
order: 1
dataset: shop
check: rows-ordered
---

`ORDER BY` sorts the result by one or more columns, smallest to largest by default.

## Watch it happen
```yaml
tables:
  users:
    columns: [name, age]
    rows:
      - [Aarav Mehta, 29]
      - [Sofia Rossi, 34]
      - [Liam Carter, 41]
      - [Mei Tanaka, 26]
      - [Noah Fischer, 38]
  sorted:
    label: result -- ORDER BY age
    columns: [name, age]
    rows:
      - [Mei Tanaka, 26]
      - [Aarav Mehta, 29]
      - [Sofia Rossi, 34]
      - [Noah Fischer, 38]
      - [Liam Carter, 41]
steps:
  - label: Unsorted
    caption: "Here are five customers from `users`. Without `ORDER BY`, the database returns rows in whatever order is handy for it."
    show: [users]
    notes:
      - { title: "no order guaranteed", text: "The same query can come back in a different order tomorrow." }
  - label: Sort key
    caption: "`ORDER BY age` names the column to sort on. Rows are compared by their `age` value alone."
    show: [users]
    highlight: [{ table: users, column: age, tone: focus }]
    notes:
      - { title: "the sort key", text: "29, 34, 41, 26, 38: no order yet.", tone: focus }
  - label: Ascending
    caption: "Ascending is the default, so `ORDER BY age` and `ORDER BY age ASC` mean the same thing: smallest first."
    show: [users, sorted]
    highlight: [{ table: users, row: 4, tone: focus }, { table: sorted, column: age, tone: focus }, { table: sorted, row: 1, tone: kept }]
    notes:
      - { title: "26 comes first", text: "Mei Tanaka is the youngest, so she moves to the top.", tone: kept }
  - label: Ties and NULLs
    caption: "Rows with equal values can come back in any order, so add a second column to break ties. A missing `age` would sort to the very end."
    show: [sorted]
    highlight: [{ table: sorted, row: 1, tone: kept }, { table: sorted, row: 2, tone: kept }, { table: sorted, row: 3, tone: kept }, { table: sorted, row: 4, tone: kept }, { table: sorted, row: 5, tone: kept }]
    notes:
      - { title: "NULLs sort last in ASC", text: "Postgres treats NULL as larger than any value. NULLS FIRST flips that." }
      - { title: "breaking ties", text: "ORDER BY age, name falls back to name when ages match." }
```

## Context
Without it the database may return rows in any order. Ascending is the default, so `ASC` is optional. Text sorts A to Z.

```sql
SELECT name, salary FROM employees ORDER BY salary ASC;
```

## Task
Return the `name` and `price` of every product, cheapest first.

## Hint
- Add `ORDER BY price` after the `FROM` clause.
- Ascending order (smallest first) is the default, so `ASC` is optional but fine to write.

## Solution
```sql
SELECT name, price FROM products ORDER BY price ASC;
```
