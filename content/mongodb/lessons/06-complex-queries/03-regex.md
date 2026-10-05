---
id: regex
title: Matching text with $regex
chapter: Complex Queries
order: 16
dataset: stream
check: rows-unordered
---

To perform pattern matching on text strings, MongoDB provides the `$regex` evaluation operator. You can pass a string pattern with the `$regex` operator or use JavaScript regular expression literal syntax like `/pattern/i`.

The `$options: 'i'` setting enables case-insensitivity, ensuring matches regardless of whether letters are uppercase or lowercase.

## Context

To find reviews that describe a film's pacing as "slow", regardless of capitalization:

```js
db.reviews.find({ comment: { $regex: 'slow', $options: 'i' } })
```

## Task

Write a query that finds all reviews from the `reviews` collection where the `comment` mentions the word `"twist"` in any case (case-insensitive).

## Hint

- Use the evaluation operator from the explanation on `comment`.
- Turn on the option that ignores letter case.

## Solution

```js
db.reviews.find({ comment: { $regex: 'twist', $options: 'i' } })
```
