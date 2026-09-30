---
id: case
title: CASE Expression
chapter: Advanced Topics
order: 3
dataset: shop
check: rows-unordered
---

`CASE` picks one value out of several based on conditions you write.

## Context
`CASE WHEN condition THEN value ... ELSE default END` checks the `WHEN` branches from top to bottom and returns the first match, or the `ELSE` value (`NULL` if there is none). It is an ordinary expression, so it can be aliased or used inside an aggregate.

## Task
Return each product's `name`, `price`, and a `tier`: 'budget' for prices under 30, 'standard'
for prices under 100, and 'premium' for everything else.

## Hint
- `CASE` checks each `WHEN` from top to bottom and stops at the first match — order the price
  ranges from lowest to highest.
- Anything that doesn't match any `WHEN` falls through to `ELSE`.

## Solution
```sql
SELECT name, price, CASE WHEN price < 30 THEN 'budget' WHEN price < 100 THEN 'standard' ELSE 'premium' END AS tier FROM products;
```
