---
id: generate-series
title: generate_series
chapter: Dates and generate_series
order: 2
dataset: food
check: rows-ordered
---

`generate_series(start, stop[, step])` is a set-returning function: it produces one row per value from `start` to `stop`, inclusive.

It works for integers:

```sql
SELECT generate_series(1, 5) AS n;
```

It also works for dates when you give an `interval` as the step. With dates it returns **timestamps** (each at midnight), so cast the values with `::date` if you only want the date:

```sql
SELECT generate_series('2026-02-26'::date, '2026-03-01'::date, '1 day'::interval)::date AS day;
```

## Context

The step can be any size. This counts from 10 to 50 in steps of 10:

```sql
SELECT generate_series(10, 50, 10) AS tens;
```

## Task

Produce every calendar day from 2026-03-02 to 2026-03-08 inclusive, one row per day, from earliest to latest. Return the values as `date`s in a column named `day`.

## Hint

- Use dates for the start and stop, and a one-day interval as the step.
- The function returns timestamps — cast them to `date` — and sort the rows by the day.

## Solution

```sql
SELECT generate_series('2026-03-02'::date, '2026-03-08'::date, '1 day'::interval)::date AS day
ORDER BY day;
```
