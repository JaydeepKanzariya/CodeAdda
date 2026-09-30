---
id: insert-many
title: INSERT Multiple Rows
chapter: Modifying Data
order: 2
dataset: shop
check: state
checkQuery: SELECT name, country, contact_email FROM suppliers ORDER BY id
---

One `INSERT` can add several rows at once by listing more than one group of values.

## Context
Separate the parenthesised groups after `VALUES` with commas. Every group needs an entry for each named column, so write `NULL` where a value is missing. It is faster than one statement per row and runs as a single operation.

## Task
Add two suppliers in a single `INSERT` statement, in this order: first "Kiwi Crafts" from "New
Zealand" with contact email "hi@kiwi.example", then "Maple Market" from "Canada" with no email.

## Hint
- One `VALUES` clause, two parenthesised groups separated by a comma.
- Use `NULL` (no quotes) for the missing email.

## Solution
```sql
INSERT INTO suppliers (name, country, contact_email) VALUES ('Kiwi Crafts', 'New Zealand', 'hi@kiwi.example'), ('Maple Market', 'Canada', NULL);
```
