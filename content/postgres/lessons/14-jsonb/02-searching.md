---
id: searching
title: Searching JSONB
chapter: JSONB
order: 2
dataset: food
check: rows-unordered
---

PostgreSQL has operators for searching inside `jsonb` documents:
- **Containment (`@>`)**: true when the left document contains the right snippet, for example `details @> '{"payment": {"method": "upi"}}'`.
- **Key exists (`?`)**: true when a top-level key is present, whatever its value, for example `details ? 'notes'`.
- **Any key / all keys (`?|`, `?&`)**: both take a `text[]` of keys. `?|` is true if any of them exists; `?&` only if all of them do.

A GIN index on the column can speed up all of these operators (you will create one later in the course).

```sql
SELECT id FROM orders
WHERE details @> '{"payment": {"method": "upi"}}';
```

## Context

The `?` operator checks that a key is present, regardless of its value. Only some orders carry delivery notes:

```sql
SELECT id, details->>'notes' AS notes
FROM orders
WHERE details ? 'notes';
```

## Task

From `orders`, return `id`, `total` and `details` for every order paid by card (the `method` inside `payment` is `"card"`). Use containment rather than reading the value out as text.

## Hint

- Containment compares against a JSON snippet with the same nesting as the document: an outer `payment` object holding the `method` you want.

## Solution

```sql
SELECT id, total, details
FROM orders
WHERE details @> '{"payment": {"method": "card"}}';
```
