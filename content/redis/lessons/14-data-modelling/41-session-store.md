---
id: session-store
title: A session store
chapter: Data Modelling
order: 1
dataset: platform
check: state
checkQuery: SNAPSHOT session:*
---

Sessions are one of the oldest jobs Redis does in production. Every request carries a session token, the app looks it up on every request, and the data must vanish on its own when the user goes idle. That is a fast key lookup plus an expiry, which is exactly what Redis is built for. The seeded ArcadePulse sessions are plain strings holding only a user ID, such as `session:beta` → `102`.

As soon as a session carries more than one value (user ID, device, tier, CSRF token), a hash fits better than a string of serialised JSON. `HSET session:<token> user_id 107 device android tier free` stores each field separately, `HGET` reads one field without parsing the rest, and changing one field does not rewrite the others. Then `EXPIRE session:<token> 1800` gives the whole hash a 30-minute life. Put both in a `MULTI` so a session never exists without its expiry, even briefly.

Idle timeout means the clock restarts on activity. On each authenticated request, call `EXPIRE` again with the full lifetime; this is a sliding session. Pair it with an absolute limit (for example, store `created_at` in the hash and refuse sessions older than 12 hours) so a stolen token that is used constantly still dies eventually.

Two traps. A TTL belongs to the whole key, so `HSET` on an existing session keeps its TTL but a session created with `HSET` alone has none and never expires. The seeded `session:orphan` and `session:legacy` strings show that leak: `TTL` returns `-1` for both, so they will sit in memory until someone deletes them. And the key name is the session token itself, so make it long and random: anyone who can guess a key can read the session. Redis 7.4 added per-field expiry with `HEXPIRE`, but whole-session TTLs remain the common design, and the lab does not implement `HEXPIRE`.

## Context

A request on an existing hash session updates one field and then slides the idle timeout back to a full 30 minutes, which `TTL` confirms:

```redis
HSET session:k4p8 user_id 108 device web
EXPIRE session:k4p8 600
HSET session:k4p8 last_path /store
EXPIRE session:k4p8 1800
TTL session:k4p8
```

## Task

User 107 has just signed in on Android. Create the session as a hash at `session:t9k2` with the fields `user_id` = `107`, `device` = `android` and `tier` = `free`, and give it an idle timeout of 30 minutes. Leave the existing sessions untouched.

## Hint

- One command can set all three fields of the hash.
- The idle timeout is a key expiry, written in seconds.
- A transaction keeps the session from ever existing without its lifetime.

## Solution

```redis
HSET session:t9k2 user_id 107 device android tier free
EXPIRE session:t9k2 1800
```
