---
id: premium-count
title: Premium Subscriber Count
chapter: Warm-up
order: 4
difficulty: Easy
check: rows-unordered
---

The marketing analytics dashboard needs to display the exact number of users subscribed to the premium tier.

## Tables

```text
Collection: users

+-------------+---------+------------------------------------------+
| Field       | Type    | Description                              |
+-------------+---------+------------------------------------------+
| _id         | number  | Unique user identifier                   |
| name        | string  | Full name                                |
| plan        | string  | Subscription plan (free/basic/premium)   |
+-------------+---------+------------------------------------------+

Sample document:
{ "_id": 101, "name": "Amina", "plan": "premium" }
```

## Task

Return how many users are on the `premium` plan, as a single number shown in a `count` column.

## Example

```text
Input:
users collection:
[
  { "_id": 101, "name": "Amina", "plan": "premium" },
  { "_id": 102, "name": "Liam", "plan": "basic" },
  { "_id": 103, "name": "Chiyo", "plan": "free" },
  { "_id": 104, "name": "Marcus", "plan": "premium" }
]

Output:
[
  { "count": 2 }
]

Explanation: Two users (Amina and Marcus) are on the premium plan.
```

## Hint

- You only need a number, not the documents themselves.
- Collections have a method that counts the documents matching a filter.

## Setup

```json
{
  "users": [
    { "_id": 101, "name": "Amina", "plan": "premium" },
    { "_id": 102, "name": "Liam", "plan": "basic" },
    { "_id": 103, "name": "Chiyo", "plan": "free" },
    { "_id": 104, "name": "Marcus", "plan": "premium" }
  ]
}
```

## Solution

```js
db.users.countDocuments({ plan: 'premium' })
```
