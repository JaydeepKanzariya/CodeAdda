---
id: nulls-last
title: Where NULLs Go When Sorting
chapter: Sorting Data
order: 4
dataset: shop
check: rows-ordered
---

`NULL` means "no value", so where does it belong in a sort? By default, Postgres treats `NULL`
as larger than any real value: an ascending sort puts `NULL`s at the end, and a descending sort
puts them at the start.

You don't have to accept the default. `NULLS FIRST` and `NULLS LAST` say exactly where the
missing values should go, regardless of `ASC` or `DESC`:

```sql
SELECT name, description FROM products ORDER BY description ASC NULLS FIRST;
```

That lists products with no description before any product that has one. The same clause works
after `DESC`, and after each column when sorting by several.

## Task
Return the `name` and `phone` of every user, sorted by `phone` with users who have no phone
number last, and use `name` to break ties among rows with the same phone value.

## Hint
- Sort by `phone` ascending, and use `NULLS LAST` to push missing phones to the end.
- Add `name` as a second sort column to settle ties.

## Solution
```sql
SELECT name, phone FROM users ORDER BY phone ASC NULLS LAST, name ASC;
```
