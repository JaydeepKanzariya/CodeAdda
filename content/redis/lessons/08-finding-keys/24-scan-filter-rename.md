---
id: scan-filter-rename
title: Filtering a scan
chapter: Finding Keys Safely
order: 2
dataset: platform
check: state
checkQuery: SNAPSHOT cache:*
---

Key names are a contract. The ArcadePulse team has agreed that every cache key should read `cache:<section>:<name>`, like `cache:game:3`, so that dashboards and clean-up jobs can group them by section. Old code still writes a few keys in the previous style, and before a migration someone has to find and fix them, safely, on a live server.

A scan can be narrowed in two ways. `MATCH pattern` filters by name with glob rules (`*` for any run of characters, `?` for exactly one, `[abc]` for one of a set). `TYPE type` keeps only keys of one data type, such as `string`, `hash` or `zset`. Both can be combined in the same call:

```redis
SCAN 0 MATCH cache:* TYPE string COUNT 100
```

That lists `cache:featured` and `cache:game:3`. The first one has only two segments, so it is the one breaking the naming rule.

`RENAME old new` moves a key to a new name and keeps its value and its TTL. It fails with `ERR no such key` if `old` is missing, and here is the trap: if `new` already exists, `RENAME` **overwrites it silently**. When you cannot be sure the new name is free, use `RENAMENX old new`, which replies `0` and changes nothing if the destination is taken. Remember too that renaming a key does not update application code that still reads the old name, so ship the code change first.

## Context

An audit asks which keys hold sorted sets, whatever their names. A `TYPE` filter answers that without reading any values:

```redis
SCAN 0 TYPE zset COUNT 100
```

## Task

Scan the `cache:*` keys and find the one key that does not follow the `cache:<section>:<name>` scheme. It holds the home page's featured game, so rename it to `cache:home:featured`. Its value must stay the same, and the other cache key must not change.

## Hint

- Scan with a pattern for the cache keys and look for the name with only two parts.
- One command moves a key to a new name and keeps its value.
- When you are done, `cache:*` should list `cache:game:3` and `cache:home:featured`, and nothing else.

## Solution

```redis
SCAN 0 MATCH cache:* COUNT 100
RENAME cache:featured cache:home:featured
```
