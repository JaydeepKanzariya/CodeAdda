---
id: row-number-rank
title: "ROW_NUMBER and RANK"
chapter: Window functions
order: 1
dataset: food
check: rows-unordered
---

A window function calculates a value across a set of rows related to the current row, but unlike `GROUP BY` it keeps every row in the result.

The `OVER (...)` clause defines the window. `PARTITION BY` splits the rows into groups, and `ORDER BY` sorts the rows inside each group:
- `ROW_NUMBER()` numbers the rows 1, 2, 3, ... with no ties.
- `RANK()` gives tied rows the same number and then skips ahead (1, 2, 2, 4).
- `DENSE_RANK()` gives tied rows the same number without skipping (1, 2, 2, 3).

This ranks restaurants by rating within each city:

```sql
SELECT name, city,
  rank() OVER (PARTITION BY city ORDER BY rating DESC) AS city_rank
FROM restaurants;
```

No two restaurants in the same city share a rating, so there `rank()` and `row_number()` give the same numbers. The three functions only part ways when values tie. At Spice Route (restaurant 1), Paneer Tikka Masala and Dal Makhani both cost 280.00. Numbering its dishes from cheapest to dearest with all three functions side by side shows the difference:

```sql
SELECT name, price,
  row_number() OVER (ORDER BY price) AS row_num,
  rank()       OVER (ORDER BY price) AS rnk,
  dense_rank() OVER (ORDER BY price) AS dense
FROM menu_items
WHERE restaurant_id = 1
ORDER BY price;
```

```text
name                | price  | row_num | rnk | dense
--------------------+--------+---------+-----+------
Garlic Naan         |  60.00 |       1 |   1 |     1
Paneer Tikka Masala | 280.00 |       2 |   2 |     2
Dal Makhani         | 280.00 |       3 |   2 |     2
Butter Chicken      | 340.00 |       4 |   4 |     3
```

`row_number()` still hands out 2 and 3 to the two tied dishes (which of them gets 2 is up to PostgreSQL). `rank()` gives both of them 2 and then skips 3, so Butter Chicken is ranked 4 because three dishes come before it. `dense_rank()` also gives both 2 but does not skip, so Butter Chicken gets 3.

## Context

`row_number()` numbers the rows inside each partition. Here the cheapest dish of each restaurant gets 1:

```sql
SELECT id, name, price,
  row_number() OVER (PARTITION BY restaurant_id ORDER BY price ASC) AS row_num
FROM menu_items
LIMIT 6;
```

## Task

Rank the dishes of each restaurant by price, most expensive first, so dishes with the same price share a rank. From `menu_items`, return `restaurant_id`, `name`, `price` and the rank as `price_rank`.

## Hint

- Window functions take `OVER (...)`; split the rows per restaurant and sort by price, highest first.
- Pick the ranking function that lets ties share a number.

## Solution

```sql
SELECT
  restaurant_id,
  name,
  price,
  rank() OVER (PARTITION BY restaurant_id ORDER BY price DESC) AS price_rank
FROM menu_items;
```
