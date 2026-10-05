---
id: group
title: Grouping with $group
chapter: Aggregation Pipeline
order: 29
dataset: stream
check: rows-unordered
---

The `$group` stage separates documents into groups according to a specified group key expression, defined by the mandatory `_id` field in the stage document.

For each group, you can compute summary values using accumulator operators such as `$sum`, `$avg`, `$min`, `$max`, or `$push`. To count documents in a group, use `{ count: { $sum: 1 } }`.

## Watch it happen

```yaml
tables:
  users_stream:
    label: users -- before group
    columns: [_id, name, plan]
    rows:
      - [101, "Amina Al-Mansoor", "premium"]
      - [102, "Liam Vance", "basic"]
      - [103, "Chiyo Takahashi", "free"]
      - [104, "Marcus Aurelius Bell", "premium"]
  grouped_plans:
    label: plans -- grouped from these 4 users
    columns: [_id, count]
    rows:
      - ["premium", 2]
      - ["basic", 1]
      - ["free", 1]
steps:
  - label: Input user documents
    caption: "Documents enter the pipeline with individual plan assignments."
    show: [users_stream]
  - label: Partition by plan key
    caption: "The $group stage groups documents that share the same plan value."
    show: [users_stream]
    highlight:
      - { table: users_stream, row: 1, tone: focus }
      - { table: users_stream, row: 4, tone: focus }
    notes:
      - { title: "Group Key", text: "The _id field in $group defines the distinct grouping expression." }
  - label: Accumulate counts
    caption: "Each group accumulates documents with { $sum: 1 }, yielding the total count per subscription tier."
    show: [grouped_plans]
    highlight:
      - { table: grouped_plans, row: 1, tone: kept }
```

## Context

To count how many movies were produced in each country:

```js
db.movies.aggregate([
  { $group: { _id: '$details.country', count: { $sum: 1 } } }
])
```

## Task

Write an aggregation pipeline on the `users` collection that groups documents by their `plan` and computes the number of users on each plan as `count`.

## Hint

- The group key goes in `_id`, and it is the field you count by, written as a field path.
- Counting means adding 1 for every document that lands in a group.

## Solution

```js
db.users.aggregate([
  { $group: { _id: '$plan', count: { $sum: 1 } } }
])
```

