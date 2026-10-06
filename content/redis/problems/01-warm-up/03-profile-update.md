---
id: profile-update
title: Profile Update
chapter: Warm-up
order: 3
difficulty: Easy
check: state
checkQuery: SNAPSHOT user:*
---

Player 113 signed up with a nickname, then finished the onboarding quest. The quest asks for a real display name, upgrades the account to the pro tier and pays out experience points. Her profile is a hash, and the fields the quest does not mention belong to her and must survive the update.

## Tables

| Key | Type | Sample value from the Setup |
|---|---|---|
| `user:113` | hash | `{ name: "Mira O.", tier: free, xp: 10, country: KE }` |
| `user:114` | hash | `{ name: "Tomas Lind", tier: plus, xp: 300, country: SE }` |

## Task

Update `user:113` so that:

- `name` is `Mira Okafor`
- `tier` is `pro`
- `xp` grows by the **40** points the quest pays, on top of whatever she already had
- `country` keeps its current value

`user:114` must not change.

## Example

**Input**

```text
user:113 = { name: "Mira O.", tier: free, xp: 10, country: KE }
user:114 = { name: "Tomas Lind", tier: plus, xp: 300, country: SE }
```

**Output** (every `user:*` key afterwards)

```text
key       type  ttl  value
user:113  hash  -1   { country: KE, name: "Mira Okafor", tier: pro, xp: 50 }
user:114  hash  -1   { country: SE, name: "Tomas Lind", tier: plus, xp: 300 }
```

**Explanation:** The name and tier are overwritten, `country` is untouched, and `xp` goes from 10 to 50. Writing `xp` as 40 would lose the 10 points she earned before the quest, which is why the reward is added rather than set.

## Hint

- A single hash write can set several fields at once and leaves every other field alone.
- A value that contains a space needs quotes.
- Hashes have their own way of adding to a numeric field without reading it first.

## Setup

```redis
HSET user:113 name "Mira O." tier free xp 10 country KE
HSET user:114 name "Tomas Lind" tier plus xp 300 country SE
```

## Solution

```redis
HSET user:113 name "Mira Okafor" tier pro
HINCRBY user:113 xp 40
```
