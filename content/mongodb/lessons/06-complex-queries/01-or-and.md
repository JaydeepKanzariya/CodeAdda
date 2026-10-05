---
id: or-and
title: Combining conditions with $or and $and
chapter: Complex Queries
order: 14
dataset: stream
check: rows-unordered
---

In MongoDB, specifying multiple comma-separated keys in a query document creates an implicit logical AND. When you need logical OR behavior—where a document matches if any one of several conditions is met—use the `$or` operator.

The `$or` operator accepts an array of condition expressions. You can combine top-level filters with `$or` in the same query to express criteria like "condition A must hold, AND either condition B or condition C must also hold".

There is also an explicit `$and` operator that takes an array of conditions. You rarely need it, because comma-separated keys already mean AND, but it becomes necessary when you combine two `$or` clauses: a query document cannot hold the key `$or` twice, so you wrap both in `$and`, for example `{ $and: [ { $or: [{ plan: 'free' }, { plan: 'basic' }] }, { $or: [{ 'preferences.max_rating': 8 }, { 'preferences.max_rating': 9 }] } ] }`.

## Watch it happen

```yaml
tables:
  candidate_movies:
    label: movies -- a sample of 5 films
    columns: [title, year, genres, runtime]
    rows:
      - ["Neon Mirage", 2021, "Comedy, Sci-Fi", 88]
      - ["Midnight in Valparaiso", 2014, "Comedy, Romance", 110]
      - ["Copper Sky", 2002, "Documentary, History", 94]
      - ["Velvet Shadow", 1998, "Comedy, Crime", 92]
      - ["Borealis Express", 1994, "Comedy, Adventure", 96]
  matched_movies:
    label: movies -- matched (year AND $or)
    columns: [title, year, genres, runtime]
    rows:
      - ["Neon Mirage", 2021, "Comedy, Sci-Fi", 88]
      - ["Midnight in Valparaiso", 2014, "Comedy, Romance", 110]
      - ["Copper Sky", 2002, "Documentary, History", 94]
steps:
  - label: Review candidates
    caption: "Five films are tested against the rule: year > 2000, plus Comedy or runtime < 95."
    show: [candidate_movies]
  - label: Filter by release year
    caption: "Velvet Shadow (1998) and Borealis Express (1994) are removed: neither was released after 2000, so the OR branches never get a say."
    show: [candidate_movies]
    highlight:
      - { table: candidate_movies, row: 4, tone: removed }
      - { table: candidate_movies, row: 5, tone: removed }
    notes:
      - { title: "Implicit AND", text: "The top-level year condition must hold whichever OR branch matches." }
  - label: Evaluate OR conditions
    caption: "Neon Mirage passes both branches, Midnight in Valparaiso passes only the Comedy branch, and Copper Sky passes only the runtime branch."
    show: [matched_movies]
    highlight:
      - { table: matched_movies, row: 1, tone: kept }
      - { table: matched_movies, row: 2, tone: kept }
      - { table: matched_movies, row: 3, tone: kept }
```

## Context

To find users who are either on the `premium` plan or have `Action` in their preferences:

```js
db.users.find({ $or: [{ plan: 'premium' }, { 'preferences.favorite_genres': 'Action' }] })
```

## Task

Write a query that finds all films from the `movies` collection released after 2000 (`year` strictly greater than 2000) that meet at least one of the following criteria:
- Have `'Comedy'` in their `genres` array
- Have a `runtime` strictly less than 95 minutes

Return the full documents.

## Hint

- The year rule always applies, so it sits at the top level of the filter beside the alternatives.
- The two alternatives go together in an array under the operator that means "any of these".

## Solution

```js
db.movies.find({
  year: { $gt: 2000 },
  $or: [
    { genres: 'Comedy' },
    { runtime: { $lt: 95 } }
  ]
})
```
