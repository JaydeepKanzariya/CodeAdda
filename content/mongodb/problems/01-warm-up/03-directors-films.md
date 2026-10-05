---
id: directors-films
title: A Director's Films
chapter: Warm-up
order: 3
difficulty: Easy
check: rows-unordered
---

A film retrospective dedicated to visionary director Amara Diop is being assembled for the platform's homepage banner.

## Tables

```text
Collection: movies

+------------------+---------+------------------------------------------+
| Field            | Type    | Description                              |
+------------------+---------+------------------------------------------+
| _id              | number  | Unique film identifier                   |
| title            | string  | Film title                               |
| year             | number  | Year of release                          |
| details.director | string  | Name of director                         |
| details.country  | string  | Country of origin                        |
+------------------+---------+------------------------------------------+

Sample document:
{ "_id": 1, "title": "Orion Rising", "year": 2015, "details": { "director": "Amara Diop", "country": "France" } }
```

## Task

Find every film directed by Amara Diop.

Each result should contain only `title` and `year` (no `_id`). Order does not matter.

## Example

```text
Input:
movies collection:
[
  { "_id": 1, "title": "Orion Rising", "year": 2015, "details": { "director": "Amara Diop", "country": "France" } },
  { "_id": 2, "title": "Tokyo Pulse", "year": 2021, "details": { "director": "Kenji Sato", "country": "Japan" } },
  { "_id": 3, "title": "Atlas Dawn", "year": 2023, "details": { "director": "Amara Diop", "country": "France" } }
]

Output:
[
  { "title": "Orion Rising", "year": 2015 },
  { "title": "Atlas Dawn", "year": 2023 }
]

Explanation: Orion Rising and Atlas Dawn were directed by Amara Diop. Tokyo Pulse has a different director.
```

## Hint

- The director lives inside the embedded `details` document.
- A field inside a sub-document can be matched on its own, without matching the whole sub-document.

## Setup

```json
{
  "movies": [
    { "_id": 1, "title": "Orion Rising", "year": 2015, "details": { "director": "Amara Diop", "country": "France" } },
    { "_id": 2, "title": "Tokyo Pulse", "year": 2021, "details": { "director": "Kenji Sato", "country": "Japan" } },
    { "_id": 3, "title": "Atlas Dawn", "year": 2023, "details": { "director": "Amara Diop", "country": "France" } }
  ]
}
```

## Solution

```js
db.movies.find({ 'details.director': 'Amara Diop' }, { _id: 0, title: 1, year: 1 })
```
