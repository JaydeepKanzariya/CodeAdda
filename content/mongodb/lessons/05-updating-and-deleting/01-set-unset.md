---
id: set-unset
title: Changing fields with $set and $unset
chapter: Updating & Deleting
order: 12
dataset: stream
check: state
checkQuery: "db.users.find().sort({ _id: 1 })"
---

To modify existing documents, MongoDB uses update operators. The `$set` operator assigns a new value to a field, creating it if it does not yet exist. The `$unset` operator completely deletes a field from the document.

You can combine both `$set` and `$unset` within the same update document to alter multiple fields in a single atomic operation.

## Watch it happen

```yaml
tables:
  before_update:
    label: users -- user 102 before update
    columns: [_id, name, plan, preferences.max_rating]
    rows:
      - [102, "Liam Vance", "basic", 8]
  after_update:
    label: users -- user 102 after update
    columns: [_id, name, plan, preferences.max_rating]
    rows:
      - [102, "Liam Vance", "premium", "—"]
steps:
  - label: Target user document
    caption: "User 102 currently has the basic plan and a max_rating restriction of 8 in their preferences."
    show: [before_update]
  - label: Apply $set and $unset
    caption: "$set updates plan to 'premium', while $unset completely strips the preferences.max_rating field."
    show: [before_update]
    notes:
      - { title: "Update operators", text: "Operators isolate changes to specified fields without overwriting other properties." }
  - label: Document after modification
    caption: "The plan is now 'premium'. The dash means preferences.max_rating is gone: the field no longer exists at all, it is not set to null."
    show: [after_update]
    highlight: [{ table: after_update, row: 1, tone: focus }]
```

## Context

To update user 103 to the `basic` plan:

```js
db.users.updateOne({ _id: 103 }, { $set: { plan: 'basic' } })
```

## Task

Write a query that updates user `102` in the `users` collection:
1. Change their `plan` to `'premium'` using `$set`.
2. Remove their `preferences.max_rating` field using `$unset`.

## Hint

- One update document can hold two operators: one to assign a value, one to remove a field.
- Reach the nested field with a quoted dot path.

## Solution

```js
db.users.updateOne({ _id: 102 }, { $set: { plan: 'premium' }, $unset: { 'preferences.max_rating': '' } })
```

