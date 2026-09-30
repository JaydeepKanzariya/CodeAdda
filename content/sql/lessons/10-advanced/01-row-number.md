---
id: row-number
title: ROW_NUMBER Window Function
chapter: Advanced Topics
order: 1
dataset: shop
check: rows-ordered
---

A window function computes a value per row from a set of related rows without collapsing the result.

## Watch it happen
```yaml
tables:
  employees:
    columns: [name, department_id, salary]
    rows:
      - [Neha Iyer, 1, "98000.00"]
      - [Arjun Das, 2, "120000.00"]
      - [Kavya Rao, 1, "150000.00"]
      - [Sara Khan, 2, "72000.00"]
      - [Vikram Singh, 1, "91000.00"]
  numbered:
    label: OVER (ORDER BY salary DESC)
    columns: [name, salary, rn]
    rows:
      - [Kavya Rao, "150000.00", 1]
      - [Arjun Das, "120000.00", 2]
      - [Neha Iyer, "98000.00", 3]
      - [Vikram Singh, "91000.00", 4]
      - [Sara Khan, "72000.00", 5]
  result:
    label: OVER (PARTITION BY department_id ORDER BY salary DESC)
    columns: [name, department_id, salary, rn]
    rows:
      - [Kavya Rao, 1, "150000.00", 1]
      - [Neha Iyer, 1, "98000.00", 2]
      - [Vikram Singh, 1, "91000.00", 3]
      - [Arjun Das, 2, "120000.00", 1]
      - [Sara Khan, 2, "72000.00", 2]
steps:
  - label: Order the rows
    caption: "Five employees from two departments. `ROW_NUMBER() OVER (ORDER BY salary DESC)` first lines them up by `salary`, highest first."
    show: [employees]
    highlight: [{ table: employees, column: salary, tone: focus }]
    notes:
      - { title: "the window's order", text: "It decides who gets 1, who gets 2, and so on.", tone: focus }
  - label: Number the rows
    caption: "Then it hands out 1, 2, 3 down that order. Every row keeps its own line; nothing is collapsed the way `GROUP BY` would do it."
    show: [employees, numbered]
    highlight: [{ table: numbered, column: rn, tone: kept }]
    notes:
      - { title: "5 rows in, 5 rows out", text: "A window function adds a column, not a summary.", tone: kept }
  - label: PARTITION BY
    caption: "Add `PARTITION BY department_id` and the numbering restarts for each department. Arjun is back to 1 because he tops department 2."
    show: [result]
    highlight: [{ table: result, row: 1, tone: focus }, { table: result, row: 2, tone: focus }, { table: result, row: 3, tone: focus }, { table: result, row: 4, tone: kept }, { table: result, row: 5, tone: kept }, { table: result, cell: [4, rn], tone: focus }]
    notes:
      - { title: "rn restarts per group", text: "Department 1 counts 1 to 3, department 2 counts 1 to 2." }
  - label: Result
    caption: "Now `rn = 1` marks the top earner in each department, which makes \"best per group\" questions easy to answer."
    show: [result]
    highlight: [{ table: result, row: 1, tone: kept }, { table: result, row: 4, tone: kept }]
    dim: [{ table: result, rows: [2, 3, 5] }]
    notes:
      - { title: "top earner per department", text: "Kavya Rao in 1, Arjun Das in 2.", tone: kept }
```

## Context
`ROW_NUMBER() OVER (ORDER BY ...)` numbers rows 1, 2, 3 in the order you give. The `ORDER BY` inside `OVER` controls the numbering and is separate from the statement's final `ORDER BY`, so keep the two in agreement.

## Task
Return each product's `name`, `price`, and a position `rank` where 1 is the most expensive,
ordered with the most expensive product first.

## Hint
- Window functions live in the `SELECT` list and need an `OVER (...)` clause that says how to
  order the rows.
- Match the outer `ORDER BY` to the same order so the numbers line up with the rows you see.

## Solution
```sql
SELECT name, price, ROW_NUMBER() OVER (ORDER BY price DESC) AS rank FROM products ORDER BY price DESC;
```
