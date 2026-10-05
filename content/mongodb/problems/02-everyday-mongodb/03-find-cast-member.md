---
id: find-cast-member
title: Find a Cast Member
chapter: Everyday MongoDB
order: 3
difficulty: Medium
check: rows-unordered
---

The casting archive system allows researchers to search for specific actor-role pairings across the catalog.

## Tables

```text
Collection: movies

+-------------+---------+------------------------------------------+
| Field       | Type    | Description                              |
+-------------+---------+------------------------------------------+
| _id         | number  | Unique film identifier                   |
| title       | string  | Film title                               |
| year        | number  | Release year                             |
| cast        | array   | Array of objects with actor and role     |
+-------------+---------+------------------------------------------+

Sample document:
{ "_id": 1, "title": "Echoes of Orion", "year": 2018, "cast": [{ "actor": "Lucas Bernard", "role": "Lead Pilot" }, { "actor": "Fatou Camara", "role": "Flight Engineer" }] }
```

## Task

Find every film in which Lucas Bernard plays the Lead Pilot. The actor and the role must belong to the **same** cast entry.

Each result should contain only `title` and `cast` (no `_id`). Order does not matter.

## Example

```text
Input:
movies collection:
[
  { "_id": 1, "title": "Echoes of Orion", "year": 2018, "cast": [{ "actor": "Lucas Bernard", "role": "Lead Pilot" }, { "actor": "Fatou Camara", "role": "Flight Engineer" }] },
  { "_id": 2, "title": "Starlight Drift", "year": 2021, "cast": [{ "actor": "Lucas Bernard", "role": "Station Commander" }, { "actor": "Kofi Mensah", "role": "Lead Pilot" }] },
  { "_id": 3, "title": "Harbor Lights", "year": 2016, "cast": [{ "actor": "Ines Duarte", "role": "Lead Pilot" }, { "actor": "Kofi Mensah", "role": "Navigator" }] }
]

Output:
[
  { "title": "Echoes of Orion", "cast": [{ "actor": "Lucas Bernard", "role": "Lead Pilot" }, { "actor": "Fatou Camara", "role": "Flight Engineer" }] }
]

Explanation: In Echoes of Orion, Lucas Bernard is the Lead Pilot. Starlight Drift has Lucas Bernard and a Lead Pilot, but they are two different cast entries. Harbor Lights has a Lead Pilot but no Lucas Bernard.
```

## Hint

- Two separate dot-notation conditions on `cast` can each be satisfied by a different array element.
- There is an operator that applies several conditions to one array element at a time.

## Setup

```json
{
  "movies": [
    {
      "_id": 1,
      "title": "Echoes of Orion",
      "year": 2018,
      "cast": [
        { "actor": "Lucas Bernard", "role": "Lead Pilot" },
        { "actor": "Fatou Camara", "role": "Flight Engineer" }
      ]
    },
    {
      "_id": 2,
      "title": "Starlight Drift",
      "year": 2021,
      "cast": [
        { "actor": "Lucas Bernard", "role": "Station Commander" },
        { "actor": "Kofi Mensah", "role": "Lead Pilot" }
      ]
    },
    {
      "_id": 3,
      "title": "Harbor Lights",
      "year": 2016,
      "cast": [
        { "actor": "Ines Duarte", "role": "Lead Pilot" },
        { "actor": "Kofi Mensah", "role": "Navigator" }
      ]
    }
  ]
}
```

## Solution

```js
db.movies.find({ cast: { $elemMatch: { actor: 'Lucas Bernard', role: 'Lead Pilot' } } }, { _id: 0, title: 1, cast: 1 })
```
