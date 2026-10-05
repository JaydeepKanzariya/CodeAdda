---
id: top-rated-sci-fi
title: Top-Rated Sci-Fi
chapter: Warm-up
order: 1
difficulty: Easy
check: rows-ordered
---

Reelhouse curates spotlight carousels for specific genres. The content team needs to showcase the two highest-rated science fiction films according to audience reception.

## Tables

```text
Collection: movies

+------------------+---------+------------------------------------------+
| Field            | Type    | Description                              |
+------------------+---------+------------------------------------------+
| _id              | number  | Unique film identifier                   |
| title            | string  | Film title                               |
| genres           | array   | List of genre classifications            |
| ratings.audience | number  | Audience rating out of 10                |
+------------------+---------+------------------------------------------+

Sample document:
{ "_id": 1, "title": "Starlight Drift", "genres": ["Sci-Fi", "Drama"], "ratings": { "audience": 8.7 } }
```

## Task

Find the two Sci-Fi films (films whose `genres` include `"Sci-Fi"`) with the highest audience rating.

Each result should contain only `title` and `ratings.audience` (no `_id`), with the highest audience rating first.

## Example

```text
Input:
movies collection:
[
  { "_id": 1, "title": "Starlight Drift", "genres": ["Sci-Fi", "Drama"], "ratings": { "audience": 8.7 } },
  { "_id": 2, "title": "Cobalt Skies", "genres": ["Drama"], "ratings": { "audience": 9.1 } },
  { "_id": 3, "title": "Nebula 9", "genres": ["Action", "Sci-Fi"], "ratings": { "audience": 9.4 } },
  { "_id": 4, "title": "Solar Wind", "genres": ["Sci-Fi"], "ratings": { "audience": 8.2 } }
]

Output:
[
  { "title": "Nebula 9", "ratings": { "audience": 9.4 } },
  { "title": "Starlight Drift", "ratings": { "audience": 8.7 } }
]

Explanation: Nebula 9 (9.4) and Starlight Drift (8.7) are the two highest-scoring Sci-Fi titles. Cobalt Skies has a higher rating (9.1) but is not a Sci-Fi film, and Solar Wind (8.2) misses the top two.
```

## Hint

- Matching a plain value against an array field checks whether any element equals it.
- A nested field is reached with dot notation, in quotes.
- Sort first, then keep only as many documents as you need.

## Setup

```json
{
  "movies": [
    { "_id": 1, "title": "Starlight Drift", "genres": ["Sci-Fi", "Drama"], "ratings": { "audience": 8.7 } },
    { "_id": 2, "title": "Cobalt Skies", "genres": ["Drama"], "ratings": { "audience": 9.1 } },
    { "_id": 3, "title": "Nebula 9", "genres": ["Action", "Sci-Fi"], "ratings": { "audience": 9.4 } },
    { "_id": 4, "title": "Solar Wind", "genres": ["Sci-Fi"], "ratings": { "audience": 8.2 } }
  ]
}
```

## Solution

```js
db.movies.find({ genres: 'Sci-Fi' }, { _id: 0, title: 1, 'ratings.audience': 1 }).sort({ 'ratings.audience': -1 }).limit(2)
```
