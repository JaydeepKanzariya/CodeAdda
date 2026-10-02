---
id: update-delete-returning
title: "UPDATE and DELETE … RETURNING"
chapter: RETURNING and UPSERT
order: 2
dataset: food
check: rows-unordered
---

`RETURNING` is not limited to `INSERT`. `UPDATE` and `DELETE` accept it too, so you can see exactly which rows a statement touched:

- With `UPDATE`, `RETURNING` shows the rows' values *after* the change.
- With `DELETE`, `RETURNING` shows the rows as they were just before they were removed.

```sql
UPDATE menu_items
SET price = price + 10
WHERE id = 3
RETURNING id, name, price;
```

Garlic Naan's price goes from 60.00 to 70.00, and the new price comes back.

## Context

Returning the deleted rows gives you a record of what was removed. This deletes the low-rated reviews and shows them; it runs inside a transaction that is rolled back, so the reviews are still there afterwards:

```sql
BEGIN;
DELETE FROM reviews
WHERE rating <= 2
RETURNING id, order_id, rating;
ROLLBACK;
```

## Task

Restaurant 1 has dishes marked as unavailable. Write an `UPDATE` that makes all of restaurant 1's unavailable dishes available again, and returns the `id` and `name` of every dish it changed.

## Hint

- The `WHERE` clause needs two conditions: the restaurant, and the dish currently being unavailable.
- A boolean column can be used as a condition on its own, or negated.

## Solution

```sql
UPDATE menu_items
SET available = true
WHERE restaurant_id = 1 AND NOT available
RETURNING id, name;
```
