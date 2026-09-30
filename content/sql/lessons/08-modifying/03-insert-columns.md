---
id: insert-columns
title: INSERT with Specific Columns
chapter: Modifying Data
order: 3
dataset: shop
check: state
checkQuery: SELECT name, email, phone, age, country, city FROM users WHERE email = 'nina@example.com'
---

List the columns you are filling, and SQL fills the rest with their defaults or `NULL`.

## Context
Naming the columns makes an `INSERT` independent of the table's column order. Any column you leave out gets its `DEFAULT`, or `NULL` if it has none. `id` is a `SERIAL`, so the database picks it for you. A `NOT NULL` column with no default, like `users.signup_date`, must always be listed.

## Task
Add a customer named `Nina Novak` with email `nina@example.com`, country `Czechia` and today's date as `signup_date`. Leave `phone`, `age` and `city` empty.

## Hint
- `INSERT INTO users (name, email, country, signup_date) VALUES (...);`
- `CURRENT_DATE` is today's date.

## Solution
```sql
INSERT INTO users (name, email, country, signup_date) VALUES ('Nina Novak', 'nina@example.com', 'Czechia', CURRENT_DATE);
```
