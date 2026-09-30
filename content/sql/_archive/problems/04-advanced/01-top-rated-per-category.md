---
id: top-rated-per-category
title: Top-Rated Product per Category
chapter: Advanced
order: 1
difficulty: Hard
dataset: shop
check: rows-unordered
---

The catalog team wants to spotlight the best-reviewed product from every category on the
homepage, but only categories that have at least one reviewed product should show up.

## Task
For each category with at least one reviewed product, return the product with the highest
average rating: the category's name as `category`, the product's name as `product`, and the
average rating rounded to 2 decimals as `avg_rating`. If two products in the same category tie
on `avg_rating`, keep the one whose name comes first alphabetically.

## Example
| category | product | avg_rating |
|---|---|---|
| Electronics | 4K Monitor | 4.50 |
| Books | Data at Scale | 5.00 |
| Home & Kitchen | Chef's Knife | 5.00 |
| Sports | Running Shoes | 4.00 |
| Toys | Building Blocks Set | 5.00 |

## Hint
- First compute each product's average rating, grouped by category and product.
- A window function can rank the rows inside each category so you can keep just the top one —
  think about what should decide the ranking, and how to break a tie.

## Solution
```sql
WITH r AS (SELECT p.category_id, p.name, AVG(rv.rating) AS avg_rating FROM products AS p JOIN reviews AS rv ON rv.product_id = p.id GROUP BY p.category_id, p.name), ranked AS (SELECT r.*, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY avg_rating DESC, name) AS rn FROM r) SELECT c.name AS category, ranked.name AS product, ROUND(ranked.avg_rating, 2) AS avg_rating FROM ranked JOIN categories AS c ON c.id = ranked.category_id WHERE rn = 1;
```
