---
id: text-casting
title: Text and casting
chapter: Data types
order: 2
check: rows-unordered
---

In PostgreSQL, `text` is the usual type for strings of any length. It has no length limit and is just as fast as `varchar`.

When numbers or dates arrive as text (for example from a CSV file or a web form), you must convert them before doing calculations. Postgres has a short cast syntax, `expression::type`, such as `'2026-03-01'::date` or `'42'::integer`.

## Context

You can turn text into a number and do maths with it straight away:

```sql
SELECT '150'::integer + 50 AS total_units;
```

## Task

From the `prices` table, return the `item` column and twice the price as a column aliased `doubled`. The price is stored as text in `price_text`, so convert it to `numeric` first.

## Hint

- Text cannot be multiplied, so cast the column to a number before you multiply.
- Put `item` first, then the calculated column with its alias.

## Solution

```sql
SELECT item, price_text::numeric * 2 AS doubled FROM prices;
```

## Setup

```sql
CREATE TABLE prices (
  item text,
  price_text text
);

INSERT INTO prices (item, price_text) VALUES
  ('Samosa', '20.00'),
  ('Tea', '15.50'),
  ('Kachori', '25.00'),
  ('Jalebi', '40.00');
```
