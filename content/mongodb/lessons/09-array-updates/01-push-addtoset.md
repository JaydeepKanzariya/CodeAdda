---
id: push-addtoset
title: Adding with $push and $addToSet
chapter: Array Updates
order: 23
dataset: stream
check: state
checkQuery: "db.users.find().sort({ _id: 1 })"
---

To append items to an array in an existing document, MongoDB offers `$push` and `$addToSet`.

The `$push` operator adds an item to the end of an array, even if the value is already present. In contrast, `$addToSet` treats the array as a set: it adds the item only if that value does not already exist in the array, preventing duplicate entries.

Both operators add a single value by default. If you hand them an array, that whole array becomes one new element. To add several values in one update, wrap them in the `$each` modifier, for example `{ $addToSet: { tags: { $each: ['a', 'b'] } } }`. With `$addToSet`, each value in the list is checked separately, so values already present are skipped and the rest are appended in order.

## Context

To add `'Sci-Fi'` to user 104's favorite genres list without creating duplicates:

```js
db.users.updateOne({ _id: 104 }, { $addToSet: { 'preferences.favorite_genres': 'Sci-Fi' } })
```

## Task

User `101` wants to add both `'Drama'` and `'Documentary'` to their `preferences.favorite_genres` array in a single update. Some of these may already be in the list, so make sure no genre ends up in the array twice.

## Hint

- One of the two genres is already there, so pick the operator that skips values already present.
- Passing a plain array adds the array itself as one element; there is a modifier that adds each value in a list separately.

## Solution

```js
db.users.updateOne({ _id: 101 }, { $addToSet: { 'preferences.favorite_genres': { $each: ['Drama', 'Documentary'] } } })
```
