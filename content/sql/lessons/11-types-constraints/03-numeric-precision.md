---
id: numeric-precision
title: Understanding DECIMAL for Money
chapter: Data Types & Constraints
order: 3
dataset: shop
check: rows-unordered
---

`DECIMAL` (also called `NUMERIC`) stores exact decimal digits, which is why it is used for money.

## Context
Floating point types such as `float8` approximate many decimal fractions, so small rounding errors creep in. `NUMERIC` keeps every digit exactly, and `shop.products.price` is `NUMERIC(10,2)` for that reason. Cast a literal with `::type` to compare the two.

## Task
Return `0.1 + 0.2` computed as `float8` as `float_sum`, and the same `0.1 + 0.2` computed as
`numeric` as `numeric_sum`, in one row.

## Hint
- `::type` casts a literal to that type — try the same addition cast two different ways.
- Give each computed column the exact alias the task asks for.

## Solution
```sql
SELECT 0.1::float8 + 0.2::float8 AS float_sum, 0.1::numeric + 0.2::numeric AS numeric_sum;
```
