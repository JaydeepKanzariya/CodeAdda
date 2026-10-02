---
id: savepoints
title: Savepoints
chapter: Transactions
order: 2
dataset: food
check: state
checkQuery: SELECT name FROM riders ORDER BY name;
---

`ROLLBACK` undoes the whole transaction back to `BEGIN`. Sometimes you only want to undo the last step and keep the earlier ones.

**Savepoints** mark points inside a transaction that you can return to:
- `SAVEPOINT name` marks a point inside the open transaction.
- `ROLLBACK TO SAVEPOINT name` undoes every change made *after* that point and keeps the earlier ones. The transaction stays open.
- `RELEASE SAVEPOINT name` removes the mark and keeps the changes.

Here the Masala Dosa price change is kept, while the mistaken Filter Coffee price is undone:

```sql
BEGIN;
UPDATE menu_items SET price = 130.00 WHERE id = 28;
SAVEPOINT before_coffee;
UPDATE menu_items SET price = 0.01 WHERE id = 30;
ROLLBACK TO SAVEPOINT before_coffee;
COMMIT;
```

## Context

Count riders before and after:

```sql
SELECT count(*) FROM riders;
```

## Task

In one transaction:
1. Insert a rider with `name` `'Vikram Rawat'`, `vehicle` `'bike'` and `joined_on` `'2026-03-25'`.
2. Create a savepoint named `sp1`.
3. Insert a second rider with `name` `'Ghost Rider'`, `vehicle` `'drone'` and `joined_on` `'2026-03-25'`.
4. Roll back to `sp1`, then commit.

Only Vikram Rawat should remain.

## Hint

- The savepoint goes between the two inserts; rolling back to it undoes only what came after it, and the transaction still needs its `COMMIT`.

## Solution

```sql
BEGIN;
INSERT INTO riders (name, vehicle, joined_on) VALUES ('Vikram Rawat', 'bike', '2026-03-25');
SAVEPOINT sp1;
INSERT INTO riders (name, vehicle, joined_on) VALUES ('Ghost Rider', 'drone', '2026-03-25');
ROLLBACK TO SAVEPOINT sp1;
COMMIT;
```
