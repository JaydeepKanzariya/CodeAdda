---
id: intersect
title: Rows in Both with INTERSECT
chapter: Set Operators
order: 3
dataset: shop
check: rows-unordered
---

`INTERSECT` keeps only the rows that show up in *both* `SELECT` statements. It's the set-theory
equivalent of "what do these two lists have in common?", and like `UNION` it removes duplicates
from the result.

This is a quick way to answer overlap questions without writing a join or a subquery.

```sql
SELECT category_id FROM products INTERSECT SELECT category_id FROM products WHERE stock = 0;
```

That returns the categories that have at least one out-of-stock product, since every row on the
right also appears on the left.

## Task
Return the countries that have both users and suppliers, as a single column `country`.

## Hint
- Same shape as `UNION`, but with `INTERSECT` between the two `SELECT` statements.
- A country only shows up if it appears on both sides.

## Solution
```sql
SELECT country FROM users INTERSECT SELECT country FROM suppliers;
```
