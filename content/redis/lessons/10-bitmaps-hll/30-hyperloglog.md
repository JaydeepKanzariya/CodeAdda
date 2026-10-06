---
id: hyperloglog
title: Counting unique visitors
chapter: Bitmaps & HyperLogLog
order: 3
dataset: platform
check: rows-unordered
---

The ArcadePulse store page wants a "unique visitors" number for every day, including visitors who are not logged in and so have no small numeric id for a bitmap. A set would give an exact count, but it stores every visitor id, and a popular page can collect millions per day. When an answer within about 1% is good enough, a **HyperLogLog** counts unique items in a fixed **12 KB** per key, however many visitors arrive.

- `PFADD key element [element ...]` records visitors. It replies `1` if the estimate changed and `0` if every element had (probably) been seen already.
- `PFCOUNT key [key ...]` returns the estimated number of unique elements. Given several keys, it counts the **union**, so a visitor seen on two days is counted once.
- `PFMERGE destkey srckey [srckey ...]` stores that union as a new HyperLogLog, for example a monthly total built from daily keys.

```redis
PFCOUNT visitors:2026-01-01
```

That replies `5`: visitors a, b, c, d and e came on January 1st.

The pitfall is adding daily numbers together. Day one has 5 visitors and day two has 4, but d and e came on both days, so the true unique total is 7, not 9. Let Redis combine the keys instead. Also know the trade-off: real Redis has a standard error of about **0.81%**, and you cannot list or remove the members you added. This lab simulates HyperLogLog exactly, so its counts come out precise.

## Context

Two more visitors, g and h, browse the store on January 2nd. Visitor g had already been recorded that day, so only h is new, and the day's count goes from 4 to 5:

```redis
PFADD visitors:2026-01-02 g h
PFCOUNT visitors:2026-01-02
```

## Task

The keys `visitors:2026-01-01` and `visitors:2026-01-02` each hold one day of store visitors. Return the number of **unique** visitors across **both days**, counting anyone who came on both days only once. Do not add any visitors.

## Hint

- Adding the two daily counts double-counts people who came back on day two.
- The counting command accepts more than one key and merges them as it counts.
- Your answer should be less than 9, the sum of the two daily counts.

## Solution

```redis
PFCOUNT visitors:2026-01-01 visitors:2026-01-02
```
