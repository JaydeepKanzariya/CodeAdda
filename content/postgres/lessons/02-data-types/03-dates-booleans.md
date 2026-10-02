---
id: dates-booleans
title: Dates, times and booleans
chapter: Data types
order: 3
check: rows-unordered
---

PostgreSQL has types for dates, times and yes/no values:
- `timestamp` stores both a calendar date and a clock time.
- You can keep just the calendar day by casting with `::date`.
- `boolean` stores `true`, `false` or `NULL`. In a `WHERE` clause, a boolean column can be used on its own, without writing `= true`.

## Context

`date_trunc` cuts a timestamp down to the start of an hour, day or month, and `NOT` flips a boolean:

```sql
SELECT date_trunc('hour', '2026-03-10 16:45:00'::timestamp) AS hour_start, NOT false AS flipped;
```

## Task

From the `deliveries` table, return the `id` and the calendar day of `ordered_at` (as a `date`, aliased `day`) for the rows that have been delivered (`delivered` is true).

## Hint

- Cast the timestamp to a date with `::`.
- A boolean column can be the whole `WHERE` condition.

## Solution

```sql
SELECT id, ordered_at::date AS day FROM deliveries WHERE delivered;
```

## Setup

```sql
CREATE TABLE deliveries (
  id integer,
  ordered_at timestamp,
  delivered boolean
);

INSERT INTO deliveries (id, ordered_at, delivered) VALUES
  (1, '2026-03-02 10:15:00', true),
  (2, '2026-03-02 11:30:00', false),
  (3, '2026-03-03 14:05:00', true),
  (4, '2026-03-04 18:20:00', true),
  (5, '2026-03-05 21:00:00', false);
```
