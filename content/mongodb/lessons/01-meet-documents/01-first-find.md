---
id: first-find
title: Your first find
chapter: Meet Documents
order: 1
dataset: stream
check: rows-unordered
---

MongoDB is a document database. Instead of storing data in rows and columns across tables, MongoDB stores data in flexible, JSON-like structures called documents, grouped into collections.

In MongoDB, you read documents from a collection with the `find()` method on the `db` object. Calling `find()` with empty parentheses or an empty filter `{}` retrieves every document in that collection.

## Context

To inspect all movies in the streaming catalog, you run:

```js
db.movies.find()
```

## Task

Write a query that retrieves every document from the `users` collection.

## Hint

- Access the collection on `db`.
- Call the `find()` method without any filter arguments.

## Solution

```js
db.users.find()
```
