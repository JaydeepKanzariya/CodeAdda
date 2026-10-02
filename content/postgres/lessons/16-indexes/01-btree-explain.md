---
id: btree-explain
title: B-tree indexes and EXPLAIN
chapter: Indexes and EXPLAIN
order: 1
dataset: food
check: custom
checkQuery: SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'orders' AND indexname = 'idx_orders_placed_at' AND indexdef ~* 'btree \(placed_at\M');
---

Without an index, PostgreSQL has to read every row of a table to find the ones that match. This is called a **sequential scan** (`Seq Scan` in a query plan).

A **B-tree index** keeps a column's values sorted in a tree, so PostgreSQL can find matching rows in a few steps, even on big tables. `CREATE INDEX` builds a B-tree unless you ask for another type.

To see how PostgreSQL plans to run a query, put `EXPLAIN` in front of it. On the small `orders` table with no index on `placed_at`, this shows a `Seq Scan`:

```sql
EXPLAIN SELECT * FROM orders WHERE placed_at > '2026-03-10';
```

## Watch it happen
```yaml
tables:
  orders_scan:
    label: orders table
    columns: [id, placed_at]
    rows:
      - [1, 2026-03-02 12:15:00]
      - [2, 2026-03-02 19:30:00]
      - [3, 2026-03-03 13:00:00]
      - [4, 2026-03-03 20:00:00]
  btree:
    label: b-tree index on placed_at
    columns: [placed_at, row_pointer]
    rows:
      - [2026-03-02 12:15:00, row 1]
      - [2026-03-02 19:30:00, row 2]
      - [2026-03-03 13:00:00, row 3]
      - [2026-03-03 20:00:00, row 4]
steps:
  - label: Seq Scan
    caption: "Without an index, PostgreSQL reads every row from first to last to test placed_at."
    show: [orders_scan]
  - label: Build B-tree
    caption: "CREATE INDEX stores the placed_at values in sorted order, each with a pointer to its row."
    show: [orders_scan, btree]
    highlight: [{ table: btree, row: 3, tone: kept }]
    notes:
      - { title: "Sorted", text: "Searching a sorted tree skips most of the values" }
  - label: Index Scan
    caption: "A filter like placed_at >= '2026-03-03' jumps to the first matching entry in the index and follows its pointers to rows 3 and 4."
    show: [orders_scan, btree]
    highlight: [{ table: btree, row: 3, tone: kept }, { table: btree, row: 4, tone: kept }, { table: orders_scan, row: 3, tone: kept }, { table: orders_scan, row: 4, tone: kept }]
    notes:
      - { title: "Index Scan", text: "Only the matching rows are read", tone: kept }
```

## Context

`EXPLAIN` shows the plan without running the query. A lookup by `id` already uses the index that comes with the primary key, so the plan says `Index Only Scan using orders_pkey`. (`EXPLAIN ANALYZE` would also run the query and add real timings.)

```sql
EXPLAIN SELECT id FROM orders WHERE id = 10;
```

## Task

Create a B-tree index named `idx_orders_placed_at` on the `placed_at` column of `orders`.

## Hint

- `CREATE INDEX` takes the index name, then `ON` the table with the column in brackets. A plain index is a B-tree, so no `USING` is needed.

## Solution

```sql
CREATE INDEX idx_orders_placed_at ON orders (placed_at);
```
