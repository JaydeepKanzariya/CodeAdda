---
id: on-conflict
title: ON CONFLICT
chapter: RETURNING and UPSERT
order: 3
dataset: food
check: state
checkQuery: SELECT name, email, city FROM customers ORDER BY email;
---

Inserting a row whose unique key (such as an email address) already exists normally fails with a unique-constraint error, and the whole statement is cancelled.

PostgreSQL's `ON CONFLICT (column)` clause lets you decide what should happen instead — an "upsert" (update or insert):
- `DO NOTHING` skips the conflicting row and inserts the rest.
- `DO UPDATE SET column = ...` updates the existing row instead. Inside it, the special table `EXCLUDED` holds the row you tried to insert.

In `order_items` each (order, dish) pair may appear only once. Order 1 already contains Garlic Naan (menu item 3) with quantity 1, so this updates that row's quantity to 2 instead of failing:

```sql
INSERT INTO order_items (order_id, menu_item_id, quantity)
VALUES (1, 3, 2)
ON CONFLICT (order_id, menu_item_id)
DO UPDATE SET quantity = EXCLUDED.quantity;
```

## Watch it happen
```yaml
tables:
  before:
    label: customers (email is UNIQUE) -- before
    columns: [name, email, city]
    rows:
      - [Aarav Sharma, aarav@example.com, Mumbai]
      - [Diya Patel, diya@example.com, Mumbai]
  attempt:
    label: rows being inserted
    columns: [name, email, city]
    rows:
      - [Aarav Sharma, aarav@example.com, Bengaluru]
      - [Simran Kaur, simran@example.com, Chandigarh]
  after:
    label: customers -- after
    columns: [name, email, city]
    rows:
      - [Aarav Sharma, aarav@example.com, Bengaluru]
      - [Diya Patel, diya@example.com, Mumbai]
      - [Simran Kaur, simran@example.com, Chandigarh]
steps:
  - label: Before the upsert
    caption: "Aarav Sharma is already registered, in Mumbai, with the email aarav@example.com."
    show: [before]
    highlight: [{ table: before, row: 1, tone: focus }]
  - label: Conflict detected
    caption: "One INSERT tries to add Aarav again (now in Bengaluru) together with the new customer Simran."
    show: [before, attempt]
    highlight: [{ table: attempt, row: 1, tone: removed }, { table: attempt, row: 2, tone: kept }]
    notes:
      - { title: "Unique conflict", text: "aarav@example.com already exists", tone: removed }
  - label: DO UPDATE applies
    caption: "Instead of failing, DO UPDATE copies EXCLUDED.city onto Aarav's existing row, and Simran is inserted normally."
    show: [after]
    highlight: [{ table: after, cell: [1, city], tone: focus }, { table: after, row: 3, tone: kept }]
```

## Context

`ON CONFLICT DO NOTHING` makes an import safe to run twice. `diya@example.com` already belongs to Diya Patel, so this inserts 0 rows and raises no error:

```sql
INSERT INTO customers (name, email, city, joined_on)
VALUES ('Diya P', 'diya@example.com', 'Pune', '2026-03-01')
ON CONFLICT (email) DO NOTHING;
```

## Task

In a single `INSERT`, add these two customers to `customers` (columns `name, email, city, joined_on`):
1. `('Aarav Sharma', 'aarav@example.com', 'Bengaluru', '2025-01-10')`
2. `('Simran Kaur', 'simran@example.com', 'Chandigarh', '2026-03-25')`

The first email already exists. When an email conflicts, update that customer's `city` to the new value instead of failing; the new customer should be inserted as usual.

## Hint

- The conflict target is the column with the unique constraint.
- `EXCLUDED` holds the row you tried to insert.

## Solution

```sql
INSERT INTO customers (name, email, city, joined_on) VALUES
  ('Aarav Sharma', 'aarav@example.com', 'Bengaluru', '2025-01-10'),
  ('Simran Kaur', 'simran@example.com', 'Chandigarh', '2026-03-25')
ON CONFLICT (email)
DO UPDATE SET city = EXCLUDED.city;
```
