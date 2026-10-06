---
id: set-options
title: Setting with options
chapter: Expiration
order: 2
dataset: platform
check: state
checkQuery: SNAPSHOT otp:*
---

`SET` takes options that turn it from a plain write into a small decision. The full shape is `SET key value [NX | XX] [GET] [EX seconds | PX milliseconds | EXAT unix-time | KEEPTTL]`:

- `EX 300` (or `PX 300000`) writes the value and starts a 5-minute timer in the same command.
- `NX` writes only if the key does **not** exist yet; `XX` writes only if it **does**.
- `GET` returns the value that was there before the write.

Doing it in one command matters. If ArcadePulse wrote a login code with `SET` and then called `EXPIRE` separately, a crash between the two would leave a code that never expires. With `EX` inside the `SET` there is no gap.

When `NX` or `XX` blocks the write, `SET` doesn't fail loudly; it replies `(nil)` instead of `OK`, and your code must check for that:

```
redis> SET session:beta 102 NX EX 900
(nil)
```

The session already exists, so nothing changed, not even its TTL. You will still meet the older commands `SETEX key seconds value` and `SETNX key value`; `SETNX` cannot set a timer at all, which is why new code uses `SET … NX EX`.

## Context

`GET` turns a write into a swap. The featured slot moves from Byte Brigade to Moonforge, and the reply is the old value, so you know what you replaced:

```redis
SET cache:featured game:2 GET
```

## Task

Player 102 asked for a sign-in code. Store the code `482913` under `otp:user:102` so that it expires after 5 minutes. If a code for that player already exists, the write must not replace it.

## Hint

- One command can write the value, start the timer and refuse to overwrite.
- The expiry option takes seconds; there is also a milliseconds form if you prefer.

## Solution

```redis
SET otp:user:102 482913 NX EX 300
```
