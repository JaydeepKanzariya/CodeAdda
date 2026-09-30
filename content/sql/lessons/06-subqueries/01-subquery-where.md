---
id: subquery-where
title: Subquery in WHERE
chapter: Subqueries
order: 1
dataset: shop
check: rows-unordered
---

A subquery is a `SELECT` nested in parentheses inside another query.

## Watch it happen
```yaml
tables:
  avg:
    label: (SELECT AVG(price) FROM products)
    columns: [avg_price]
    rows:
      - ["67.72"]
  products:
    columns: [name, price]
    rows:
      - [Wireless Earbuds, "59.99"]
      - [Mechanical Keyboard, "89.50"]
      - [4K Monitor, "329.00"]
      - [Yoga Mat, "22.00"]
      - [Tennis Racket, "120.00"]
  result:
    label: result -- price above average
    columns: [name, price]
    rows:
      - [Mechanical Keyboard, "89.50"]
      - [4K Monitor, "329.00"]
      - [Tennis Racket, "120.00"]
steps:
  - label: Parentheses run
    caption: "The part in parentheses runs first. `SELECT AVG(price) FROM products` looks at all 20 products and returns a single number."
    show: [avg]
    highlight: [{ table: avg, row: 1, tone: focus }]
    notes:
      - { title: "one row, one column", text: "About 67.72, shown rounded here.", tone: focus }
  - label: Swap it in
    caption: "Postgres then treats the outer query as if you had typed that number yourself: `WHERE price > 67.72`."
    show: [avg, products]
    highlight: [{ table: avg, row: 1, tone: focus }, { table: products, column: price, tone: focus }]
    notes:
      - { title: "computed, not typed", text: "Change a price and the average updates with it." }
  - label: Compare each row
    caption: "Each product's `price` is checked against the average. Three of these five are above it."
    show: [avg, products]
    highlight: [{ table: avg, row: 1, tone: focus }, { table: products, row: 1, tone: removed }, { table: products, row: 2, tone: kept }, { table: products, row: 3, tone: kept }, { table: products, row: 4, tone: removed }, { table: products, row: 5, tone: kept }]
    notes:
      - { title: "3 above, 2 below", text: "59.99 and 22.00 fall short.", tone: kept }
  - label: Result
    caption: "One statement did both jobs: the inner query worked out the average, and the outer query kept only the products priced above it."
    show: [avg, result]
    highlight: [{ table: result, row: 1, tone: kept }, { table: result, row: 2, tone: kept }, { table: result, row: 3, tone: kept }]
    notes:
      - { title: "5 rows in, 3 rows out", text: "A scalar subquery must return exactly one value.", tone: kept }
```

## Context
When it returns a single value you can compare against it in `WHERE`. The inner query runs first and its result filters the outer rows.

```sql
SELECT name, salary FROM employees WHERE salary > (SELECT AVG(salary) FROM employees);
```

## Task
Return the `name` and `price` of products priced above the average product price.

## Hint
- Write `(SELECT AVG(price) FROM products)` as a subquery inside `WHERE`.
- Compare `price` against that subquery with `>`.

## Solution
```sql
SELECT name, price FROM products WHERE price > (SELECT AVG(price) FROM products);
```
