---
id: building-updating
title: Building and updating JSONB
chapter: JSONB
order: 3
dataset: food
check: state
checkQuery: SELECT id, details FROM orders WHERE id = 2;
---

PostgreSQL gives you several ways to change a `jsonb` document:
- **Concatenation (`||`)**: merges two documents at the top level. New keys are added; if a key already exists, its value is overwritten by the one on the right.
- **`jsonb_set(target, path, new_value)`**: sets the value at a path given as a text array, such as `'{address, landmark}'`. If the last key is missing, it is added inside the existing object.
- **Deletion (`-` and `#-`)**: `-` removes a top-level key; `#-` removes a nested path.

```sql
UPDATE orders
SET details = jsonb_set(details, '{address, landmark}', '"Near the park"')
WHERE id = 5;
```

## Context

You can build a JSON document from ordinary columns with `jsonb_build_object('key', value, ...)`:

```sql
SELECT jsonb_build_object('id', id, 'name', name) AS rider_obj
FROM riders
LIMIT 2;
```

## Task

Order `2` in `orders` has no delivery notes yet. Add a top-level key `"notes"` with the string value `"Leave at gate"` to its `details`, keeping every other key as it is.

## Hint

- Merge a small JSON document holding just the new key into the existing one, and update only order 2.

## Solution

```sql
UPDATE orders
SET details = details || '{"notes": "Leave at gate"}'::jsonb
WHERE id = 2;
```
