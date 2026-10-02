---
id: calculator
title: Postgres as a calculator
chapter: Meet Postgres
order: 2
check: rows-unordered
---

Postgres comes with many built-in maths functions, text helpers and operators. You can use it as a calculator to do arithmetic and change text without needing a table.

For example, `round(value, places)` rounds a `numeric` value to that many decimal places (for a `double precision` value, cast it first: `round(sqrt(2)::numeric, 2)`). Text functions like `upper(text)` and `lower(text)` change letter case, and `now()` returns the current date and time.

## Context

You can put several expressions in one `SELECT`, separated by commas:

```sql
SELECT 100 - 15 AS balance, round(sqrt(2)::numeric, 3) AS root, lower('POSTGRES') AS quiet;
```

## Task

Write a query that returns three columns:
1. `7 * 6` aliased as `answer`
2. `10 / 3.0` rounded to 2 decimal places using `round(...)`, aliased as `third`
3. The text `'adda'` in capital letters using `upper(...)`, aliased as `shout`

## Hint

- Each column is its own expression with its own alias, and commas go between them.
- `round` takes two arguments: the value first, then how many decimal places to keep.

## Solution

```sql
SELECT 7 * 6 AS answer, round(10 / 3.0, 2) AS third, upper('adda') AS shout;
```

## Setup

```sql
CREATE TABLE _start (n int);
DROP TABLE _start;
```
