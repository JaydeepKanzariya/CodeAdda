---
id: mark-long-views
title: Mark Long Views Complete
chapter: Everyday MongoDB
order: 4
difficulty: Medium
check: state
checkQuery: "db.watch_history.find().sort({ _id: 1 })"
---

A tracking bug resulted in some lengthy viewing sessions not being flagged as finished. Any session where the subscriber watched for at least 120 minutes should have its `completed` status set to `true`.

## Tables

```text
Collection: watch_history

+---------------+---------+------------------------------------------+
| Field         | Type    | Description                              |
+---------------+---------+------------------------------------------+
| _id           | number  | Unique session identifier                |
| user_id       | number  | Subscriber ID                            |
| movie_id      | number  | Watched film ID                          |
| duration_mins | number  | Total minutes watched                    |
| completed     | boolean | Completion status                        |
+---------------+---------+------------------------------------------+

Sample document:
{ "_id": 1, "user_id": 101, "movie_id": 3, "duration_mins": 135, "completed": false }
```

## Task

Change the `watch_history` collection so that every session of 120 minutes or more has `completed` set to `true`. Leave every other field, and every shorter session, exactly as it is.

## Example

```text
Input:
watch_history collection:
[
  { "_id": 1, "user_id": 101, "movie_id": 3, "duration_mins": 135, "completed": false },
  { "_id": 2, "user_id": 102, "movie_id": 5, "duration_mins": 45, "completed": false },
  { "_id": 3, "user_id": 101, "movie_id": 7, "duration_mins": 120, "completed": false },
  { "_id": 4, "user_id": 103, "movie_id": 3, "duration_mins": 30, "completed": true }
]

Output (the collection afterwards, sorted by _id):
[
  { "_id": 1, "user_id": 101, "movie_id": 3, "duration_mins": 135, "completed": true },
  { "_id": 2, "user_id": 102, "movie_id": 5, "duration_mins": 45, "completed": false },
  { "_id": 3, "user_id": 101, "movie_id": 7, "duration_mins": 120, "completed": true },
  { "_id": 4, "user_id": 103, "movie_id": 3, "duration_mins": 30, "completed": true }
]

Explanation: Sessions 1 (135 min) and 3 (exactly 120 min) are now complete. Session 2 is too short and stays incomplete, and session 4 was already complete and is untouched.
```

## Hint

- More than one document needs to change, so pick the update method that touches every match.
- An update takes a filter first, then an operator that sets a field without replacing the document.

## Setup

```json
{
  "watch_history": [
    { "_id": 1, "user_id": 101, "movie_id": 3, "duration_mins": 135, "completed": false },
    { "_id": 2, "user_id": 102, "movie_id": 5, "duration_mins": 45, "completed": false },
    { "_id": 3, "user_id": 101, "movie_id": 7, "duration_mins": 120, "completed": false },
    { "_id": 4, "user_id": 103, "movie_id": 3, "duration_mins": 30, "completed": true }
  ]
}
```

## Solution

```js
db.watch_history.updateMany({ duration_mins: { $gte: 120 } }, { $set: { completed: true } })
```
