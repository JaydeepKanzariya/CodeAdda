---
id: contains-unnest
title: Containment and unnest
chapter: Arrays
order: 2
dataset: food
check: rows-unordered
---

Two tools cover most array work:

1. **Containment (`@>`)**: `left @> right` is true when the left array contains every element of the right array, for example `tags @> '{veg,spicy}'`.
2. **Expansion (`unnest`)**: `unnest(array)` turns one array into a set of rows, one row per element. Once each element is its own row, you can filter, group and count them like any other value.

```sql
SELECT name, unnest(tags) AS single_tag
FROM menu_items
WHERE restaurant_id = 1;
```

## Watch it happen
```yaml
tables:
  dishes_array:
    label: menu_items with tags
    columns: [id, name, tags]
    rows:
      - [1, Butter Chicken, "{non-veg,bestseller}"]
      - [2, Paneer Tikka Masala, "{veg,spicy,bestseller}"]
  exploded_tags:
    label: unnest(tags) rows
    columns: [id, tag]
    rows:
      - [1, non-veg]
      - [1, bestseller]
      - [2, veg]
      - [2, spicy]
      - [2, bestseller]
steps:
  - label: Array rows
    caption: "Each dish keeps several tags inside a single column value."
    show: [dishes_array]
  - label: Unnesting
    caption: "unnest(tags) unpacks each element into its own row: 2 tags plus 3 tags give 5 rows."
    show: [exploded_tags]
    highlight: [{ table: exploded_tags, row: 2, tone: focus }, { table: exploded_tags, row: 5, tone: focus }]
    notes:
      - { title: "Expanded", text: "bestseller now appears as separate rows, ready for GROUP BY" }
  - label: Aggregation
    caption: "GROUP BY on the unnested tag counts how many dishes carry each tag."
    show: [exploded_tags]
    highlight: [{ table: exploded_tags, row: 2, tone: kept }, { table: exploded_tags, row: 5, tone: kept }]
    notes:
      - { title: "Countable", text: "bestseller: 2 in these two dishes (9 across the whole menu)", tone: kept }
```

## Context

Containment checks that every listed element is present. These are the dishes tagged both veg and spicy:

```sql
SELECT name FROM menu_items WHERE tags @> '{veg,spicy}';
```

## Task

Count how many dishes in `menu_items` carry each tag. Return one row per tag with the columns `tag` and `dish_count`.

## Hint

- `unnest` turns each tag into its own row, so you can group by it and count.

## Solution

```sql
SELECT unnest(tags) AS tag, count(*) AS dish_count
FROM menu_items
GROUP BY tag;
```
