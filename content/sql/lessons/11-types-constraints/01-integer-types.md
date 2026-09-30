---
id: integer-types
title: Understanding INTEGER Types
chapter: Data Types & Constraints
order: 1
dataset: shop
check: state
checkQuery: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'counters' ORDER BY ordinal_position
---

Postgres has three integer types that differ in range and storage size.

## Watch it happen
```yaml
tables:
  orders:
    columns: [id, quantity]
    rows:
      - [1, 2]
      - [5, 3]
      - [10, 4]
      - [13, 2]
  types:
    label: integer types
    columns: [type, bytes, max]
    rows:
      - [SMALLINT, 2, "32767"]
      - [INTEGER, 4, "2147483647"]
      - [BIGINT, 8, "9223372036854775807"]
  tries:
    label: INSERT into a SMALLINT column
    columns: [value, outcome]
    rows:
      - [120, stored]
      - [32767, stored]
      - [40000, out of range]
steps:
  - label: Whole numbers
    caption: "`orders.quantity` only ever holds whole numbers like 2, 3 and 4. That's the job of an integer type."
    show: [orders]
    highlight: [{ table: orders, column: quantity, tone: focus }]
    notes:
      - { title: "no fractions", text: "Half a keyboard isn't a thing, so no decimals needed.", tone: focus }
  - label: SMALLINT
    caption: "`SMALLINT` takes 2 bytes and holds values up to 32767. Fine for small counts, like a rating or an age."
    show: [types]
    highlight: [{ table: types, row: 1, tone: focus }]
    notes:
      - { title: "-32768 to 32767", tone: focus }
  - label: INTEGER
    caption: "`INTEGER` takes 4 bytes and reaches about 2.1 billion. It's the usual default, and the type of `quantity` and every `id` in `shop`."
    show: [types]
    highlight: [{ table: types, row: 2, tone: focus }]
    notes:
      - { title: "about ±2.1 billion", tone: focus }
  - label: BIGINT
    caption: "`BIGINT` takes 8 bytes and goes past 9 quintillion. Reach for it for huge counters, like bytes transferred or event ids."
    show: [types]
    highlight: [{ table: types, row: 3, tone: focus }]
    notes:
      - { title: "about ±9.2 × 10^18", tone: focus }
  - label: Out of range
    caption: "Values that fit are stored. Try to put 40000 into a `SMALLINT` and Postgres refuses the whole statement with an error."
    show: [types, tries]
    highlight: [{ table: types, row: 1, tone: focus }, { table: tries, row: 1, tone: kept }, { table: tries, row: 2, tone: kept }, { table: tries, row: 3, tone: removed }]
    notes:
      - { title: "smallint out of range", text: "No silent wrap-around: overflow is an error.", tone: removed }
  - label: Pick smallest safe
    caption: "Choose the smallest type that will comfortably fit every value you expect, now and later. When unsure, `INTEGER` is a safe start."
    show: [types]
    highlight: [{ table: types, row: 2, tone: kept }]
    notes:
      - { title: "leave headroom", text: "Changing a column's type later means rewriting the table.", tone: focus }
```

## Context
`SMALLINT` uses 2 bytes, `INTEGER` 4 bytes (the type of `shop`'s `id` columns) and `BIGINT` 8 bytes. Pick the smallest that safely fits your values, because a value outside the range raises an error.

## Task
Create a table named `counters` with three columns: `id SMALLINT`, `views INTEGER`, and
`total_bytes BIGINT`.

## Hint
- `CREATE TABLE counters (col1 TYPE1, col2 TYPE2, col3 TYPE3);`
- The column names and types must match exactly, in that order.

## Solution
```sql
CREATE TABLE counters (id SMALLINT, views INTEGER, total_bytes BIGINT);
```
