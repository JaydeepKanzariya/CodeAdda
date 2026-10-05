---
id: reviewer-summary
title: Reviewer Summary
chapter: Aggregation & Power
order: 2
difficulty: Hard
check: rows-ordered
---

The community team is rewarding active reviewers. They need a summary of how many reviews each subscriber has written and how generous their scores are, including subscribers who have not reviewed anything yet.

## Tables

```text
Collection: users

+-------------+---------+------------------------------------------+
| Field       | Type    | Description                              |
+-------------+---------+------------------------------------------+
| _id         | number  | Unique user identifier                   |
| name        | string  | User full name                           |
+-------------+---------+------------------------------------------+

Sample document:
{ "_id": 101, "name": "Amina" }

Collection: reviews

+-------------+---------+------------------------------------------+
| Field       | Type    | Description                              |
+-------------+---------+------------------------------------------+
| _id         | number  | Unique review identifier                 |
| user_id     | number  | Reviewer ID (users._id)                  |
| movie_id    | number  | Film ID                                  |
| rating      | number  | Score (1 to 10)                          |
+-------------+---------+------------------------------------------+

Sample document:
{ "_id": 501, "user_id": 101, "movie_id": 1, "rating": 9 }
```

## Task

Return one document for **every** user, with:
- `name`: the user's name
- `review_count`: how many reviews they wrote (`0` if none)
- `avg_rating`: the average of their review ratings, rounded to 1 decimal place, or `null` if they wrote no reviews

Do not include `_id`. Order users by `review_count` from most to fewest; when two users have the same `review_count`, order them alphabetically by `name`.

## Example

```text
Input:
users collection:
[
  { "_id": 101, "name": "Amina" },
  { "_id": 102, "name": "Liam" },
  { "_id": 103, "name": "Chiyo" },
  { "_id": 104, "name": "Diego" }
]

reviews collection:
[
  { "_id": 501, "user_id": 101, "movie_id": 1, "rating": 9 },
  { "_id": 502, "user_id": 101, "movie_id": 2, "rating": 8 },
  { "_id": 503, "user_id": 102, "movie_id": 1, "rating": 10 },
  { "_id": 504, "user_id": 101, "movie_id": 3, "rating": 6 },
  { "_id": 505, "user_id": 104, "movie_id": 2, "rating": 7 },
  { "_id": 506, "user_id": 104, "movie_id": 3, "rating": 8 },
  { "_id": 507, "user_id": 102, "movie_id": 3, "rating": 9 }
]

Output:
[
  { "name": "Amina", "review_count": 3, "avg_rating": 7.7 },
  { "name": "Diego", "review_count": 2, "avg_rating": 7.5 },
  { "name": "Liam", "review_count": 2, "avg_rating": 9.5 },
  { "name": "Chiyo", "review_count": 0, "avg_rating": null }
]

Explanation: Amina wrote three reviews (9, 8, 6), averaging 7.66..., which rounds to 7.7. Diego and Liam both wrote two, so Diego comes first alphabetically. Chiyo wrote none, so her count is 0 and her average is null.
```

## Hint

- Start from `users` so that users without reviews are not lost.
- After joining, each user carries an array of their reviews; array expressions can measure it and average a field across it.
- Rounding works on the average once you have it.
- A sort can use more than one field; the later fields only break ties.

## Setup

```json
{
  "users": [
    { "_id": 101, "name": "Amina" },
    { "_id": 102, "name": "Liam" },
    { "_id": 103, "name": "Chiyo" },
    { "_id": 104, "name": "Diego" }
  ],
  "reviews": [
    { "_id": 501, "user_id": 101, "movie_id": 1, "rating": 9 },
    { "_id": 502, "user_id": 101, "movie_id": 2, "rating": 8 },
    { "_id": 503, "user_id": 102, "movie_id": 1, "rating": 10 },
    { "_id": 504, "user_id": 101, "movie_id": 3, "rating": 6 },
    { "_id": 505, "user_id": 104, "movie_id": 2, "rating": 7 },
    { "_id": 506, "user_id": 104, "movie_id": 3, "rating": 8 },
    { "_id": 507, "user_id": 102, "movie_id": 3, "rating": 9 }
  ]
}
```

## Solution

```js
db.users.aggregate([
  { $lookup: { from: 'reviews', localField: '_id', foreignField: 'user_id', as: 'user_reviews' } },
  {
    $project: {
      _id: 0,
      name: 1,
      review_count: { $size: '$user_reviews' },
      avg_rating: { $round: [{ $avg: '$user_reviews.rating' }, 1] }
    }
  },
  { $sort: { review_count: -1, name: 1 } }
])
```
