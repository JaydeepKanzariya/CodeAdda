---
id: insert-returning
title: "INSERT … RETURNING"
chapter: RETURNING and UPSERT
order: 1
dataset: food
check: rows-unordered
---

When a table generates its own primary key, you often need to know which id a new row received. Without help, that takes a second query.

PostgreSQL's `RETURNING` clause solves this. Add `RETURNING column1, column2` (or `RETURNING *`) to an `INSERT`, and the statement hands back the values of the rows it just inserted — including generated ids and defaults.

```sql
INSERT INTO customers (name, email, city, joined_on)
VALUES ('Deepak Kumar', 'deepak@example.com', 'Delhi', '2026-03-01')
RETURNING id, name;
```

The dataset has 15 customers, so this returns id 16.

## Watch it happen
```yaml
tables:
  riders_before:
    label: riders (before)
    columns: [id, name, vehicle]
    rows:
      - [4, Praveen Yadav, cycle]
      - [5, Deepak Rawat, scooter]
  riders_after:
    label: riders (after)
    columns: [id, name, vehicle]
    rows:
      - [4, Praveen Yadav, cycle]
      - [5, Deepak Rawat, scooter]
      - [6, Vikram Singh, bike]
steps:
  - label: Insert with RETURNING
    caption: "A new rider is inserted without an id. The last existing rider has id 5."
    show: [riders_before]
    highlight: [{ table: riders_before, row: 2, tone: focus }]
  - label: Values come back
    caption: "The identity column generates id 6 for Vikram Singh, and RETURNING sends id and name straight back to the client."
    show: [riders_after]
    highlight: [{ table: riders_after, row: 3, tone: kept }, { table: riders_after, cell: [3, id], tone: focus }]
    notes:
      - { title: "Returned row", text: "id: 6, name: Vikram Singh", tone: focus }
```

## Context

`RETURNING` saves a round trip, and it avoids guessing the id with a separate query while other sessions insert at the same time:

```sql
INSERT INTO restaurants (name, city, cuisine, opening_hours)
VALUES ('Dosa Plaza', 'Mumbai', 'South Indian', '{"mon":{"open":"08:00","close":"22:00"}}')
RETURNING id;
```

## Task

Insert a new rider into `riders` with:
- `name`: `'Vikram Singh'`
- `vehicle`: `'bike'`
- `joined_on`: `'2026-03-20'`

Have the statement return the generated `id` and the `name`.

## Hint

- Leave `id` out of the column list; the table generates it.
- The `RETURNING` clause goes at the very end of the `INSERT`.

## Solution

```sql
INSERT INTO riders (name, vehicle, joined_on)
VALUES ('Vikram Singh', 'bike', '2026-03-20')
RETURNING id, name;
```
