---
id: is-not-null
title: IS NOT NULL
chapter: Filtering Data
order: 10
dataset: shop
check: rows-unordered
---

`IS NOT NULL` keeps rows where a column actually has a value.

## Watch it happen
```yaml
tables:
  users:
    columns: [name, phone]
    rows:
      - [Liam Carter, 555-1003]
      - [Lucas Silva, null]
      - [Hana Kim, 555-1010]
      - [Rohan Gupta, null]
      - [Isla Murphy, 555-1012]
  result:
    label: result -- WHERE phone IS NOT NULL
    columns: [name, phone]
    rows:
      - [Liam Carter, 555-1003]
      - [Hana Kim, 555-1010]
      - [Isla Murphy, 555-1012]
steps:
  - label: Missing values
    caption: "Two of these five customers have no phone number, so their `phone` is `NULL`. This time we want the ones we *can* call."
    show: [users]
    highlight: [{ table: users, cell: [2, phone], tone: focus }, { table: users, cell: [4, phone], tone: focus }]
    notes:
      - { title: "2 NULL, 3 filled in", tone: focus }
  - label: IS NOT NULL
    caption: "`WHERE phone IS NOT NULL` keeps every row that has a real value and drops the rows where it's missing."
    show: [users]
    highlight: [{ table: users, row: 1, tone: kept }, { table: users, row: 2, tone: removed }, { table: users, row: 3, tone: kept }, { table: users, row: 4, tone: removed }, { table: users, row: 5, tone: kept }]
    notes:
      - { title: "<> NULL won't work", text: "Like = NULL, it gives unknown for every row." }
  - label: Result
    caption: "Three customers have a phone number, so three rows come back."
    show: [users, result]
    highlight: [{ table: users, row: 1, tone: kept }, { table: users, row: 3, tone: kept }, { table: users, row: 5, tone: kept }, { table: result, row: 1, tone: kept }, { table: result, row: 2, tone: kept }, { table: result, row: 3, tone: kept }]
    dim: [{ table: users, rows: [2, 4] }]
    notes:
      - { title: "5 rows in, 3 rows out", tone: kept }
  - label: Count check
    caption: "`IS NULL` and `IS NOT NULL` split a column cleanly in two. Every row lands in exactly one of them."
    show: [result]
    highlight: [{ table: result, row: 1, tone: kept }, { table: result, row: 2, tone: kept }, { table: result, row: 3, tone: kept }]
    notes:
      - { title: "3 + 2 = 5", text: "3 with a phone plus 2 without adds back up to all 5 rows." }
      - { title: "a quick cross-check", text: "COUNT(phone) also gives 3, because COUNT skips NULLs.", tone: focus }
```

## Context
It is the only reliable "has a value" test; `phone <> NULL` never matches, for the same reason `= NULL` does not.

```sql
SELECT name, phone FROM users WHERE phone IS NOT NULL;
```

## Task
Return the `name` and `description` of products that have a description.

## Hint
- Use `WHERE description IS NOT NULL`.

## Solution
```sql
SELECT name, description FROM products WHERE description IS NOT NULL;
```
