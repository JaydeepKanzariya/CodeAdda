---
id: first-query
title: Your first query
chapter: Meet Postgres
order: 1
check: rows-unordered
---

PostgreSQL (often just “Postgres”) is a free database that stores your data in tables and answers questions you ask in SQL.

In PostgreSQL, you can run a `SELECT` statement without querying any table. This is handy for trying out values, testing expressions, or showing a simple message. Text values in SQL go inside single quotes: `'...'`. You can give the resulting column a readable header with the `AS` keyword; that header is called an alias.

## Context

You can select any text or number directly:

```sql
SELECT 'CodeAdda Postgres' AS platform;
```

## Task

Write a query that selects the text `'Hello, Postgres!'` with the column alias `greeting`.

## Hint

- Start with `SELECT`, then the text in single quotes.
- Name the column with the `AS` keyword.

## Solution

```sql
SELECT 'Hello, Postgres!' AS greeting;
```

## Setup

```sql
CREATE TABLE _start (n int);
DROP TABLE _start;
```
