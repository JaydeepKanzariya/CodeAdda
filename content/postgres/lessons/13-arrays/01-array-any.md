---
id: array-any
title: Array columns and ANY
chapter: Arrays
order: 1
dataset: food
check: rows-unordered
---

PostgreSQL lets a column hold a list of values. A column of type `text[]` holds an array of text, and `integer[]` holds an array of whole numbers. In the `food` data, both `restaurants.tags` and `menu_items.tags` are `text[]` columns.

To ask "does this array contain a given value?", write `value = ANY(array_column)`. It is true when the value equals any one element of the array.

```sql
SELECT name, tags
FROM menu_items
WHERE 'spicy' = ANY(tags);
```

## Context

You can also build an array right in the query with `ARRAY['a', 'b']` (or write it as the string `'{a,b}'`). The `&&` operator is true when two arrays share at least one element, so this finds restaurants tagged either curry or pizza:

```sql
SELECT name, tags
FROM restaurants
WHERE tags && ARRAY['curry', 'pizza'];
```

## Task

From `menu_items`, return `id`, `name` and `tags` for every dish whose `tags` array includes `'bestseller'`.

## Hint

- Put the search word on the left of `= ANY(...)` and the array column inside the brackets.

## Solution

```sql
SELECT id, name, tags
FROM menu_items
WHERE 'bestseller' = ANY(tags);
```
