---
id: sequences
title: Working with sequences
chapter: Identity and sequences
order: 2
dataset: food
check: rows-unordered
---

Both `serial` and identity columns get their numbers from a **sequence**: a small database object that hands out increasing integers. Many sessions can ask it for numbers at the same time without ever receiving the same one.

You can also create your own sequence with `CREATE SEQUENCE` and use it through these functions:
- `nextval('sequence_name')` advances the sequence and returns the new value.
- `currval('sequence_name')` returns the value that `nextval` last gave *your* session.

```sql
CREATE SEQUENCE order_number_seq START 1000;
SELECT nextval('order_number_seq') AS next_order;
```

`nextval` is never rolled back: if a transaction takes a number and then fails, that number is simply skipped, so gaps are normal.

## Context

Each call to `nextval` moves the sequence forward, so the second `SELECT` here returns 501:

```sql
CREATE SEQUENCE invoice_seq START 500;
SELECT nextval('invoice_seq') AS invoice_id;
SELECT nextval('invoice_seq') AS invoice_id;
```

## Task

1. Create a sequence named `ticket_no` that starts at 100.
2. In a single `SELECT`, take two values from it, aliased as `first` and `second`.

Each check starts from a fresh database, so you get 100 and 101. In the editor, running it twice fails because the sequence already exists — press Reset DB to start over.

## Hint

- `CREATE SEQUENCE` takes a `START` option.
- Call the function that advances the sequence twice in the same select list.

## Solution

```sql
CREATE SEQUENCE ticket_no START 100;
SELECT nextval('ticket_no') AS first, nextval('ticket_no') AS second;
```
