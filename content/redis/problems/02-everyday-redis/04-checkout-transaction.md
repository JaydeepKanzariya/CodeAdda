---
id: checkout-transaction
title: Checkout Transaction
chapter: Everyday Redis
order: 8
difficulty: Medium
check: state
checkQuery: SNAPSHOT stock:* wallet:* cart:*
---

Player 101 is buying the Byte Brigade "Neon Visor" skin (item 7) for 40 coins. Checkout touches three keys: the shop's stock count, the player's coin wallet and the player's cart. If the server crashed halfway, the shop could lose a skin without being paid, so all three changes must be sent to Redis as **one transaction** that runs without any other client's commands in between.

## Tables

| Key | Type | Sample value from the Setup |
|---|---|---|
| `stock:item:7` | string (integer) | `5` |
| `stock:item:9` | string (integer) | `3` |
| `wallet:101` | string (integer coins) | `120` |
| `wallet:102` | string (integer coins) | `55` |
| `cart:101` | set | `item:3`, `item:7` |
| `cart:102` | set | `item:9` |

## Task

Complete player 101's purchase of item 7, as a single transaction:

- `stock:item:7` goes down by **1**
- `wallet:101` goes down by **40**
- `item:7` leaves `cart:101`; `item:3` stays there because the player is not buying it today

Nothing belonging to item 9 or player 102 may change.

## Example

**Input**

```text
stock:item:7 = 5     stock:item:9 = 3
wallet:101   = 120   wallet:102   = 55
cart:101     = { item:3, item:7 }
cart:102     = { item:9 }
```

**Output** (every `stock:*`, `wallet:*` and `cart:*` key afterwards)

```text
key           type    ttl  value
cart:101      set     -1   [item:3]
cart:102      set     -1   [item:9]
stock:item:7  string  -1   4
stock:item:9  string  -1   3
wallet:101    string  -1   80
wallet:102    string  -1   55
```

**Explanation:** The stock drops from 5 to 4, the wallet from 120 to 80, and only `item:7` is removed from the cart. Deleting the whole cart would also throw away `item:3`. Inside a transaction the three commands are queued and then run together when it is executed; leaving one of them out (for example forgetting the cart) is the classic half-finished checkout.

## Hint

- Open a transaction, queue the three changes, then execute it.
- Counters can be lowered by one or by any amount without reading them first.
- Remove a single member from the cart rather than the cart key itself.

## Setup

```redis
SET stock:item:7 5
SET stock:item:9 3
SET wallet:101 120
SET wallet:102 55
SADD cart:101 item:3 item:7
SADD cart:102 item:9
```

## Solution

```redis
MULTI
DECR stock:item:7
DECRBY wallet:101 40
SREM cart:101 item:7
EXEC
```
