---
id: unique-check
title: UNIQUE and CHECK
chapter: Constraints
order: 2
check: state
checkQuery: SELECT tc.constraint_type, ccu.column_name, (cc.check_clause IS NOT NULL AND regexp_replace(cc.check_clause, '[() ]|::numeric', '', 'g') ~ '^(price>0(\.0+)?|0(\.0+)?<price)$') AS requires_positive_price FROM information_schema.table_constraints tc JOIN information_schema.constraint_column_usage ccu USING (constraint_schema, constraint_name) LEFT JOIN information_schema.check_constraints cc USING (constraint_schema, constraint_name) WHERE tc.table_name = 'menu' AND tc.constraint_type IN ('UNIQUE','CHECK') ORDER BY 1, 2;
---

Constraints are rules the table enforces on every row:
- `UNIQUE` means no two rows may hold the same (non-null) value in that column or combination of columns.
- `CHECK (expression)` means every inserted or changed row must make the expression true, for example a price above zero.

You can add them to an existing table with `ALTER TABLE`, and give each one a name of your choice:

```sql
CREATE TABLE riders (phone text, age integer);
ALTER TABLE riders ADD CONSTRAINT riders_phone_unique UNIQUE (phone);
ALTER TABLE riders ADD CONSTRAINT riders_adult CHECK (age >= 18);
```

## Watch it happen
```yaml
tables:
  valid_table:
    label: menu -- existing rows
    columns: [id, name, price]
    rows:
      - [1, Biryani, "280.00"]
      - [2, Raita, "50.00"]
  duplicate_attempt:
    label: menu -- attempt 1
    columns: [id, name, price]
    rows:
      - [1, Biryani, "280.00"]
      - [2, Raita, "50.00"]
      - [3, Biryani, "120.00"]
  negative_attempt:
    label: menu -- attempt 2
    columns: [id, name, price]
    rows:
      - [1, Biryani, "280.00"]
      - [2, Raita, "50.00"]
      - [3, Pulao, "-10.00"]
steps:
  - label: Existing rows
    caption: "The menu table holds two dishes, each with its own name and a positive price."
    show: [valid_table]
  - label: Add constraints
    caption: "UNIQUE (name) forbids a second row with the same name; CHECK (price > 0) forbids a price of zero or less."
    show: [valid_table]
    notes:
      - { title: "Rules active", text: "PostgreSQL now tests every later INSERT or UPDATE against both rules." }
  - label: Duplicate name
    caption: "Inserting another 'Biryani' at 120.00 is rejected: the price is fine, but the name already exists."
    show: [duplicate_attempt]
    highlight: [{ table: duplicate_attempt, row: 3, tone: removed }]
    notes:
      - { title: "UNIQUE violation", text: "duplicate key value violates unique constraint \"menu_name_key\"", tone: removed }
  - label: Negative price
    caption: "Inserting 'Pulao' at -10.00 is rejected: the name is new, but the price fails the check."
    show: [negative_attempt]
    highlight: [{ table: negative_attempt, row: 3, tone: removed }]
    notes:
      - { title: "CHECK violation", text: "new row for relation \"menu\" violates check constraint \"menu_price_check\"", tone: removed }
```

## Context

Constraints can also be written straight into `CREATE TABLE`, and you can list them afterwards:

```sql
CREATE TABLE coupons (code text UNIQUE, discount integer CHECK (discount BETWEEN 1 AND 50));
SELECT constraint_type FROM information_schema.table_constraints WHERE table_name = 'coupons' ORDER BY 1;
```

## Task

Add two constraints to the existing `menu` table:
1. A `UNIQUE` constraint on the `name` column.
2. A `CHECK` constraint ensuring that `price > 0`.

## Hint

- Both rules can go in one `ALTER TABLE menu` statement, separated by a comma. Each one starts with `ADD`.

## Solution

```sql
ALTER TABLE menu ADD UNIQUE (name), ADD CHECK (price > 0);
```

## Setup

```sql
CREATE TABLE menu (
  id integer,
  name text,
  price numeric(6,2)
);

INSERT INTO menu (id, name, price) VALUES
  (1, 'Biryani', 280.00),
  (2, 'Raita', 50.00);
```
