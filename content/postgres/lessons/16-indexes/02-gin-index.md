---
id: gin-index
title: GIN indexes for JSONB and arrays
chapter: Indexes and EXPLAIN
order: 2
dataset: food
check: custom
checkQuery: SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'menu_items' AND indexdef ILIKE '%gin%tags%');
---

B-tree indexes work on single values such as numbers, dates and strings. Arrays (`text[]`) and `jsonb` documents hold many elements in one value, so they need a different kind of index.

A **GIN index** (Generalized Inverted Index) records, for each element inside the column, which rows contain it. GIN indexes speed up the array operators `@>`, `<@` and `&&`, and the JSONB operators `@>`, `?`, `?|` and `?&`. A filter written as `'x' = ANY(tags)` cannot use a GIN index; write it as `tags @> '{x}'` instead.

```sql
CREATE INDEX idx_orders_details ON orders USING gin (details);
```

## Context

List a table's indexes and their types from `pg_indexes`:

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'restaurants';
```

## Task

Create a GIN index named `idx_menu_items_tags` on the `tags` column of `menu_items`.

## Hint

- It is the same `CREATE INDEX` statement as for a B-tree, with `USING` and the index type placed before the column list.

## Solution

```sql
CREATE INDEX idx_menu_items_tags ON menu_items USING gin (tags);
```
