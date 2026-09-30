---
id: monthly-revenue
title: Monthly Revenue
chapter: Aggregation
order: 2
difficulty: Medium
dataset: shop
check: rows-ordered
---

The finance team wants a month-by-month revenue trend from `orders` to spot seasonal swings
before the next planning meeting.

## Task
Return each month that has orders as `month` (formatted `YYYY-MM`), together with `revenue`, the
sum of `quantity * price` for every order placed that month. Order the rows by `month` ascending.

## Example
| month | revenue |
|---|---|
| 2024-01 | 689.43 |
| 2024-02 | 1056.98 |
| 2024-03 | 336.44 |
| 2024-04 | 542.97 |

## Hint
- Join `orders` to `products` to get each order's `price`, then group by the formatted month.
- A date-formatting function can turn `order_date` into a `'YYYY-MM'` string to group and sort by.

## Solution
```sql
SELECT TO_CHAR(o.order_date, 'YYYY-MM') AS month, SUM(o.quantity * p.price) AS revenue FROM orders AS o JOIN products AS p ON p.id = o.product_id GROUP BY 1 ORDER BY 1;
```
