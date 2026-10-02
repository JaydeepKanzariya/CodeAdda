---
id: reading-values
title: Reading JSONB values
chapter: JSONB
order: 1
dataset: food
check: rows-unordered
---

A `jsonb` column stores a JSON document in a parsed, binary form, so PostgreSQL can search and index it quickly. In the `food` data, `orders.details` is `jsonb` and holds each order's address, payment and optional notes.

To read values out of a `jsonb` document:
- `-> 'key'` returns the value as `jsonb` (an object, array, number or quoted string).
- `->> 'key'` returns the value as plain `text`.
- For nested objects, chain them: `->` for each level, then `->>` for the last key.

```sql
SELECT id, details->'address'->>'area' AS area
FROM orders;
```

## Watch it happen
```yaml
tables:
  orders_json:
    label: orders with JSONB details
    columns: [id, details]
    rows:
      - [1, '{"notes": "Ring the bell", "address": {"area": "Bandra", "pincode": "400050"}, "payment": {"method": "upi"}}']
      - [2, '{"address": {"area": "Colaba", "pincode": "400005"}, "payment": {"method": "card"}}']
steps:
  - label: JSON documents
    caption: "The details column holds a whole JSON document per order."
    show: [orders_json]
  - label: Drill into an object
    caption: "details->'address' returns the address object, still as jsonb."
    show: [orders_json]
    highlight: [{ table: orders_json, cell: [1, details], tone: focus }]
    notes:
      - { title: "address object", text: '{"area": "Bandra", "pincode": "400050"}' }
  - label: Read text
    caption: "details->'address'->>'area' reads the leaf value as plain text: 'Bandra' and 'Colaba'."
    show: [orders_json]
    highlight: [{ table: orders_json, cell: [1, details], tone: kept }, { table: orders_json, cell: [2, details], tone: kept }]
    notes:
      - { title: "Extracted", text: "Plain text, ready for WHERE, GROUP BY or display", tone: kept }
```

## Context

The same chain reads any nested key. Here is the pincode of the first three orders:

```sql
SELECT id, details->'address'->>'pincode' AS pincode
FROM orders
LIMIT 3;
```

## Task

From `orders`, return each order's `id` and its payment method as text, aliased as `payment_method`. The method lives under the `payment` object, in the `method` key.

## Hint

- Use `->` to step into the outer object and `->>` to read the last key as text.

## Solution

```sql
SELECT id, details->'payment'->>'method' AS payment_method
FROM orders;
```
