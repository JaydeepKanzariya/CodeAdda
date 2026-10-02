---
id: numbers
title: "Numbers: integer and numeric"
chapter: Data types
order: 1
check: rows-unordered
---

Postgres treats whole numbers (`integer` or `bigint`) differently from decimal numbers. When you divide two integers like `10 / 4`, Postgres does integer division: it throws away the remainder and returns `2`.

If at least one side is a decimal like `4.0`, Postgres uses `numeric`, an exact decimal type that keeps as many digits as it needs, so `10 / 4.0` shows as `2.5000000000000000`. You can also convert a value to another type with the cast operator `::`. For example, `value::numeric(6,2)` means at most 6 digits in total, 2 of them after the decimal point, and rounds it to 2 decimal places (a value with more than 4 digits before the point is an error).

## Context

Casting to `numeric(precision, scale)` rounds the number to that many decimal places:

```sql
SELECT 45 / 2 AS int_div, 45 / 2.0 AS dec_div, 12.3456::numeric(5,2) AS rounded;
```

## Task

Write a query that returns three columns:
1. `10 / 4` aliased as `whole`
2. `10 / 4.0` aliased as `exact`
3. `19.999` cast to `numeric(6,2)` with the `::` operator, aliased as `price`

## Hint

- Each value is just an expression in the `SELECT` list, followed by its alias.
- The cast goes straight after the number: `::`, then the type with its two numbers in parentheses.

## Solution

```sql
SELECT 10 / 4 AS whole, 10 / 4.0 AS exact, 19.999::numeric(6,2) AS price;
```

## Setup

```sql
CREATE TABLE _start (n int);
DROP TABLE _start;
```
