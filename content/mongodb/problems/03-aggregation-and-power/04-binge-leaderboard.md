---
id: binge-leaderboard
title: Binge-Watch Leaderboard
chapter: Aggregation & Power
order: 4
difficulty: Hard
check: rows-ordered
---

Reelhouse runs a monthly rewards program honoring its most dedicated movie fans. Only finished viewings earn credit, and the leaderboard shows subscribers by name rather than by ID.

## Tables

```text
Collection: watch_history

+---------------+---------+------------------------------------------+
| Field         | Type    | Description                              |
+---------------+---------+------------------------------------------+
| _id           | number  | Unique session identifier                |
| user_id       | number  | Subscriber ID (users._id)                |
| movie_id      | number  | Watched film ID                          |
| duration_mins | number  | Minutes spent watching                   |
| completed     | boolean | Whether the viewing was finished         |
+---------------+---------+------------------------------------------+

Sample document:
{ "_id": 1, "user_id": 101, "movie_id": 1, "duration_mins": 120, "completed": true }

Collection: users

+-------------+---------+------------------------------------------+
| Field       | Type    | Description                              |
+-------------+---------+------------------------------------------+
| _id         | number  | Unique user identifier                   |
| name        | string  | User name                                |
+-------------+---------+------------------------------------------+

Sample document:
{ "_id": 101, "name": "Amina" }
```

## Task

Find the top 3 subscribers by total minutes of **completed** viewings (sessions where `completed` is `false` do not count).

Each result should contain exactly two fields:
- `name`: the subscriber's name from `users`
- `total_mins`: the sum of `duration_mins` over their completed sessions

Do not include `_id`. Order the result by `total_mins` from highest to lowest.

## Example

```text
Input:
watch_history collection:
[
  { "_id": 1, "user_id": 101, "movie_id": 1, "duration_mins": 120, "completed": true },
  { "_id": 2, "user_id": 102, "movie_id": 2, "duration_mins": 90, "completed": true },
  { "_id": 3, "user_id": 101, "movie_id": 3, "duration_mins": 60, "completed": false },
  { "_id": 4, "user_id": 103, "movie_id": 1, "duration_mins": 200, "completed": false },
  { "_id": 5, "user_id": 104, "movie_id": 2, "duration_mins": 45, "completed": true },
  { "_id": 6, "user_id": 103, "movie_id": 4, "duration_mins": 70, "completed": true },
  { "_id": 7, "user_id": 102, "movie_id": 3, "duration_mins": 100, "completed": true },
  { "_id": 8, "user_id": 104, "movie_id": 1, "duration_mins": 30, "completed": true }
]

users collection:
[
  { "_id": 101, "name": "Amina" },
  { "_id": 102, "name": "Liam" },
  { "_id": 103, "name": "Chiyo" },
  { "_id": 104, "name": "Diego" }
]

Output:
[
  { "name": "Liam", "total_mins": 190 },
  { "name": "Amina", "total_mins": 120 },
  { "name": "Diego", "total_mins": 75 }
]

Explanation: Counting completed sessions only, Liam has 90 + 100 = 190, Amina has 120 (her 60-minute session was not finished), Diego has 45 + 30 = 75 and Chiyo has 70. Chiyo's unfinished 200-minute session does not count, so she misses the top 3.
```

## Hint

- Throw away the unfinished sessions before adding anything up.
- Total per user first, then rank and cut the list.
- Names live in another collection; join them in and reshape each document to the two requested fields.

## Setup

```json
{
  "watch_history": [
    { "_id": 1, "user_id": 101, "movie_id": 1, "duration_mins": 120, "completed": true },
    { "_id": 2, "user_id": 102, "movie_id": 2, "duration_mins": 90, "completed": true },
    { "_id": 3, "user_id": 101, "movie_id": 3, "duration_mins": 60, "completed": false },
    { "_id": 4, "user_id": 103, "movie_id": 1, "duration_mins": 200, "completed": false },
    { "_id": 5, "user_id": 104, "movie_id": 2, "duration_mins": 45, "completed": true },
    { "_id": 6, "user_id": 103, "movie_id": 4, "duration_mins": 70, "completed": true },
    { "_id": 7, "user_id": 102, "movie_id": 3, "duration_mins": 100, "completed": true },
    { "_id": 8, "user_id": 104, "movie_id": 1, "duration_mins": 30, "completed": true }
  ],
  "users": [
    { "_id": 101, "name": "Amina" },
    { "_id": 102, "name": "Liam" },
    { "_id": 103, "name": "Chiyo" },
    { "_id": 104, "name": "Diego" }
  ]
}
```

## Solution

```js
db.watch_history.aggregate([
  { $match: { completed: true } },
  { $group: { _id: '$user_id', total_mins: { $sum: '$duration_mins' } } },
  { $sort: { total_mins: -1 } },
  { $limit: 3 },
  { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
  { $unwind: '$user' },
  { $project: { _id: 0, name: '$user.name', total_mins: 1 } }
])
```
