---
id: keys
title: Primary and foreign keys
chapter: Constraints
order: 3
check: state
checkQuery: SELECT tc.table_name, tc.constraint_type, kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu USING (constraint_name, table_name) WHERE tc.constraint_type IN ('PRIMARY KEY','FOREIGN KEY') AND tc.table_schema = 'public' ORDER BY 1, 2, 3;
---

A **primary key** identifies each row in a table. It means the column is both `UNIQUE` and `NOT NULL`.

A **foreign key** links a column in one table to a primary key or a unique column in another table. Postgres then makes sure the link is always valid: you cannot insert a row that points to a parent that does not exist, and you cannot delete a parent that still has rows pointing to it (unless you ask for cascading deletes).

```sql
CREATE TABLE menus (id integer, title text);
CREATE TABLE menu_pages (id integer, menu_id integer);
ALTER TABLE menus ADD PRIMARY KEY (id);
ALTER TABLE menu_pages ADD FOREIGN KEY (menu_id) REFERENCES menus(id);
```

## Watch it happen
```yaml
tables:
  parent:
    label: restaurants
    columns: [id, name]
    rows:
      - [1, Spice Hub]
  child:
    label: dishes
    columns: [id, restaurant_id, name]
    rows:
      - [101, 1, Paneer Tikka]
  orphan:
    label: dishes -- attempted insert
    columns: [id, restaurant_id, name]
    rows:
      - [101, 1, Paneer Tikka]
      - [102, 99, Malai Kofta]
steps:
  - label: Parent and child
    caption: "Restaurant 1 exists, and dish 101 points to it through restaurant_id."
    show: [parent, child]
  - label: Add keys
    caption: "restaurants.id and dishes.id become primary keys, and a foreign key links dishes.restaurant_id to restaurants.id."
    show: [parent, child]
    notes:
      - { title: "Link enforced", text: "dishes.restaurant_id must match an existing restaurants.id" }
  - label: Orphan rejected
    caption: "Inserting a dish for restaurant 99 is blocked, because restaurant 99 does not exist."
    show: [orphan]
    highlight: [{ table: orphan, row: 2, tone: removed }]
    notes:
      - { title: "Foreign key violation", text: 'Key (restaurant_id)=(99) is not present in table "restaurants".', tone: removed }
```

## Context

Keys can also be declared inside `CREATE TABLE`. Here a shop must belong to a real city:

```sql
CREATE TABLE cities (id integer PRIMARY KEY, name text);
CREATE TABLE shops (id integer PRIMARY KEY, city_id integer REFERENCES cities(id));
SELECT table_name, constraint_type FROM information_schema.table_constraints WHERE table_name IN ('cities','shops') AND constraint_type <> 'CHECK' ORDER BY 1, 2;
```

## Task

Add the following constraints:
1. A `PRIMARY KEY` on `id` in the `restaurants` table.
2. A `PRIMARY KEY` on `id` in the `dishes` table.
3. A `FOREIGN KEY` on `dishes.restaurant_id` referencing `restaurants(id)`.

## Hint

- Each table gets its own `ALTER TABLE`, and the primary-key clause names the column in parentheses.
- The foreign key belongs on the child table (`dishes`) and names the parent with `REFERENCES`.

## Solution

```sql
ALTER TABLE restaurants ADD PRIMARY KEY (id);
ALTER TABLE dishes ADD PRIMARY KEY (id);
ALTER TABLE dishes ADD FOREIGN KEY (restaurant_id) REFERENCES restaurants(id);
```

## Setup

```sql
CREATE TABLE restaurants (
  id integer,
  name text
);

CREATE TABLE dishes (
  id integer,
  restaurant_id integer,
  name text
);

INSERT INTO restaurants (id, name) VALUES (1, 'Spice Hub');
INSERT INTO dishes (id, restaurant_id, name) VALUES (101, 1, 'Paneer Tikka');
```
