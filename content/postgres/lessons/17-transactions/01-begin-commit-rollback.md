---
id: begin-commit-rollback
title: "BEGIN, COMMIT and ROLLBACK"
chapter: Transactions
order: 1
dataset: food
check: state
checkQuery: SELECT status, count(*) FROM orders GROUP BY 1 ORDER BY 1;
---

A transaction groups several statements into one unit of work: either all of them take effect or none do (the **A**, atomicity, in ACID).
- `BEGIN` starts a transaction.
- `COMMIT` makes every change since `BEGIN` permanent.
- `ROLLBACK` throws away every change since `BEGIN`, leaving the data as it was.

If something goes wrong half-way, `ROLLBACK` makes sure a half-finished change never stays in the database. Here a price rise and a sold-out dish at Dosa Corner are saved together:

```sql
BEGIN;
UPDATE menu_items SET price = price + 10 WHERE restaurant_id = 8;
UPDATE menu_items SET available = false WHERE id = 30;
COMMIT;
```

## Watch it happen
```yaml
tables:
  tx_orders:
    label: orders status
    columns: [id, status]
    rows:
      - [39, placed]
      - [40, placed]
steps:
  - label: Initial state
    caption: "Orders 39 and 40 are the only two with status 'placed'."
    show: [tx_orders]
  - label: Commit transaction
    caption: "Transaction 1 sets order 39 to 'delivered' and runs COMMIT, so the change stays."
    show: [tx_orders]
    highlight: [{ table: tx_orders, cell: [1, status], tone: kept }]
    notes:
      - { title: "Committed", text: "Order 39 is now delivered for good", tone: kept }
  - label: Rollback transaction
    caption: "Transaction 2 cancels the remaining placed order (40), then runs ROLLBACK, so order 40 is still 'placed'."
    show: [tx_orders]
    highlight: [{ table: tx_orders, cell: [2, status], tone: focus }]
    notes:
      - { title: "Discarded", text: "The cancel is undone completely" }
```

## Context

Check the current status counts before you start:

```sql
SELECT status, count(*) FROM orders GROUP BY status;
```

## Task

Run two transactions, one after the other:
1. In the first, mark order `39` as `'delivered'` and keep the change.
2. In the second, set every order that is still `'placed'` to `'cancelled'`, then throw that change away.

## Hint

- Each transaction starts with `BEGIN`. End the first with the keyword that saves, and the second with the keyword that undoes.

## Solution

```sql
BEGIN;
UPDATE orders SET status = 'delivered' WHERE id = 39;
COMMIT;

BEGIN;
UPDATE orders SET status = 'cancelled' WHERE status = 'placed';
ROLLBACK;
```
