---
id: session-with-expiry
title: Session With Expiry
chapter: Warm-up
order: 1
difficulty: Easy
check: state
checkQuery: SNAPSHOT session:*
---

Mira (player 113) has just signed in to ArcadePulse on her laptop. The login service keeps one string per session, and a session that nobody refreshes must disappear on its own after half an hour of inactivity, so nobody has to run a cleanup job.

## Tables

| Key | Type | Sample value from the Setup |
|---|---|---|
| `session:101` | string, TTL 900 s | `user-101` |
| `session:108` | string, TTL 300 s | `user-108` |

## Task

Create the session for player 113:

- key `session:113`
- value `user-113`
- it must expire in exactly **1800 seconds** (30 minutes)

The two sessions that already exist must keep their values and their remaining lifetimes.

## Example

**Input**

```text
session:101 = "user-101"  (TTL 900)
session:108 = "user-108"  (TTL 300)
```

**Output** (every `session:*` key afterwards)

```text
key          type    ttl   value
session:101  string  900   user-101
session:108  string  300   user-108
session:113  string  1800  user-113
```

**Explanation:** The new key holds the player's handle and carries a 1800-second countdown from the moment it is written. A plain write with no lifetime would leave `session:113` with a TTL of -1, which means it would live forever and the login would never time out.

## Hint

- A string can be written and given a lifetime in the same command, so there is never a moment when the session exists without one.
- Watch the unit: the lifetime here is counted in seconds, not milliseconds.

## Setup

```redis
SET session:101 user-101 EX 900
SET session:108 user-108 EX 300
```

## Solution

```redis
SET session:113 user-113 EX 1800
```
