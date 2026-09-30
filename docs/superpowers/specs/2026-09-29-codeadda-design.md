# CodeAdda — Design Spec

- **Date:** 2026-09-29
- **Status:** Draft, awaiting review
- **Working name:** "CodeAdda" (placeholder; brand name to be chosen before public launch)

## 1. Goal

An interactive, browser-based lab for learning databases by writing real queries, modelled on
the ChaiCode SQL Lab (labs.chaicode.com/sql). It covers four labs: **SQL**, **PostgreSQL**,
**MongoDB** and **Redis**.

**Now:** a personal learning tool that runs on the owner's laptop. No login, signup or hosting.

**Later:** a public product. Hosting, accounts and sign-up are **out of scope for v1**, but the
design must let them be added without a rewrite.

### Success criteria for v1

1. `npm install && npm run dev` opens the app. The SQL, PostgreSQL, and simulated MongoDB/Redis
   labs work with no Docker.
2. `docker compose up` additionally enables a "Real" mode for MongoDB and Redis.
3. In each lab the learner can browse chapters and lessons, read the explanation, write a query
   in a code editor, run it, see results or errors, be told whether the answer is correct, reveal
   a hint and the solution, inspect the schema and sample data, and reset the data.
4. Lessons and problems are Markdown files. Adding a file makes it appear in the sidebar without
   code changes. `npm run check-content` verifies every solution.
5. The UI reproduces the SQL Lab's layout and design tokens, in light and dark themes.
6. All lesson content is original (not copied from ChaiCode).

## 2. Decisions

| Topic | Decision | Reason |
|---|---|---|
| Front end | React 19 + Vite + TypeScript | Lab runs client-side (WASM DB, Monaco); no need for SSR. Same stack as the reference lab. |
| Styling | Tailwind CSS v4, themed with the reference lab's CSS variables | Owner's choice; tokens give an identical look |
| SQL / PostgreSQL engine | PGlite (Postgres compiled to WebAssembly) in the browser | Real Postgres, no server, instant reset |
| MongoDB / Redis | **Hybrid:** in-browser simulator by default, plus a "Real" mode backed by Docker | Works with zero setup; the real databases are available for full fidelity |
| Real-mode server | Node 22 + Express + TypeScript | Long-lived DB connections, per-session sandboxes |
| Code editor | Monaco (`@monaco-editor/react`) | Same as the reference lab |
| Content | Original lessons written for this project, plus a hand-editable Markdown format so the owner can add their own | Safe to publish; the owner can extend it |
| Progress storage | Browser `localStorage` behind a `ProgressStore` interface | Swappable for a server store once accounts exist |
| Repo | Monorepo with npm workspaces, at `D:\Jaydeep\codeadda` | One install, shared types |

## 3. Architecture

```
codeadda/
├── apps/
│   ├── web/                 React + Vite app (all UI)
│   └── server/              Express server — used only by "Real" mode
├── packages/
│   ├── core/                shared types: Engine, Lesson, Dataset, CheckMode, QueryResult
│   ├── engine-pglite/       SQL + PostgreSQL labs (browser)
│   ├── engine-mongo-sim/    MongoDB simulator (browser, uses `mingo`)
│   ├── engine-redis-sim/    Redis simulator (browser, hand-written)
│   ├── engine-remote/       browser client that forwards to apps/server (Mongo/Redis real mode)
│   └── content-loader/      parses lesson Markdown + front-matter, validates it
├── content/
│   ├── sql/ postgres/ mongodb/ redis/
├── scripts/check-content.ts
├── docker-compose.yml       mongo:8, redis:8, server
└── docs/
```

### 3.1 Engine interface (the core abstraction)

Every lab talks to its database only through this interface. The UI never knows which database
or mode is in use.

```ts
interface Engine {
  readonly kind: 'sql' | 'mongodb' | 'redis';
  readonly mode: 'browser' | 'real';
  setup(dataset: Dataset): Promise<void>;         // create + seed a fresh sandbox
  run(query: string, opts?: { timeoutMs?: number }): Promise<QueryResult>;
  reset(): Promise<void>;                         // back to the lesson's dataset
  snapshot(query: string): Promise<QueryResult>;  // read state for `state` checks
  describe(): Promise<SchemaInfo>;                // tables/collections/keys for the schema panel
  dispose(): Promise<void>;
}

type QueryResult =
  | { ok: true; columns: string[]; rows: unknown[][]; rowCount: number; durationMs: number; notice?: string }
  | { ok: false; error: { message: string; position?: number; code?: string } };
```

- **SQL / PostgreSQL** share `engine-pglite`. The two labs differ only in content and datasets.
- **MongoDB** queries are written in mongosh syntax (`db.users.find({ age: { $gt: 30 } })`). A
  small parser turns them into `{ collection, method, args }`. The simulator runs them with
  `mingo`; real mode sends the same structure to the server. Supported in the simulator:
  `find` (with `sort`, `limit`, `skip`, `projection`), `findOne`, `countDocuments`, `distinct`,
  `aggregate`, `insertOne/Many`, `updateOne/Many`, `deleteOne/Many`, `replaceOne`. Anything else
  (indexes, `explain`, transactions) is marked "Real mode only".
- **Redis** commands are one per line, in redis-cli syntax. Simulator v1 supports: strings
  (`SET GET MSET MGET INCR INCRBY DECR APPEND STRLEN`), keys (`DEL EXISTS KEYS SCAN TYPE RENAME
  EXPIRE TTL PERSIST`), lists (`LPUSH RPUSH LPOP RPOP LRANGE LLEN LINDEX`), hashes (`HSET HGET
  HGETALL HDEL HEXISTS HINCRBY HKEYS HVALS`), sets (`SADD SREM SMEMBERS SISMEMBER SCARD SINTER
  SUNION SDIFF`), sorted sets (`ZADD ZRANGE ZREVRANGE ZSCORE ZRANK ZINCRBY ZREM ZCARD
  ZRANGEBYSCORE`). Other commands return "Real mode only". Pub/sub, streams and Lua are Real mode
  only.
- A **mode switch** (Simulated / Real) appears only in the MongoDB and Redis labs. The choice is
  remembered per lab.

### 3.2 Real-mode server (`apps/server`)

- `POST /api/session` → `{ sessionId }`: creates a sandbox. MongoDB gets its own database
  `lab_<sessionId>`. Redis gets its own ACL user restricted to the key pattern `lab:<sessionId>:*`.
  The Redis engine prefixes keys transparently, so learners type `SET name alice`.
- `POST /api/:lab/setup | run | reset | describe | snapshot`: mirrors the Engine interface.
- `GET /api/health`: tells the UI whether Real mode is available.
- Safety (v1 is local but built for hosting later): 5-second query timeout, result cap of 1,000
  rows or documents, and blocked commands (`FLUSHALL`, `CONFIG`, `SHUTDOWN`, `MONITOR`, `SELECT`;
  `dropDatabase` is allowed only on the session's own database). `FLUSHDB` is rewritten to delete only
  the session's `lab:<sessionId>:*` keys. Sandboxes are deleted after 2 hours idle.
- The server binds to `localhost` only in v1.

### 3.3 Data flow (running a query)

1. Learner presses Run (or Ctrl/⌘+Enter).
2. The UI calls `engine.run(query)`, which goes to PGlite or the simulator in the browser, or to
   the server in real mode.
3. The result goes to the Results panel.
4. Answer check: on a separate "grader" engine, the checker runs the learner's query and the
   lesson's **solution**, each on a fresh copy of the dataset, and compares the two results
   using the lesson's check mode. The learner's own database is not touched by checking. The lesson is marked complete in `ProgressStore` on success.

## 4. Content format

### 4.1 Layout

```
content/<lab>/
  lab.json                       { "id", "title", "subtitle", "language": "sql|mongodb|redis",
                                   "chapters": ["Querying Data", ...] }   ← defines sidebar order
  datasets/<name>.sql | .json | .redis
  lessons/<NN-chapter>/<NN-slug>.md
  problems/<NN-group>/<NN-slug>.md
```

### 4.2 Lesson file

````markdown
---
id: sql-where-clause          # unique within the lab
title: WHERE Clause
chapter: Filtering Data       # must match a chapter in lab.json
order: 9
dataset: shop
check: rows-unordered         # rows-unordered | rows-ordered | state | custom
checkQuery: ""                # only for check: state | custom
---

Explanation in Markdown (code blocks, tables, images).

## Task
What the learner must do.

## Hint
One or more hints.

## Solution
```sql
SELECT * FROM users WHERE country = 'USA';
```
````

Problem files add `difficulty: Easy | Medium | Hard` and a `## Example` section. They may
declare their own `setup` block instead of a shared dataset.

### 4.3 Check modes

| Mode | Passes when |
|---|---|
| `rows-unordered` | same columns (names, in order) and the same rows as a multiset |
| `rows-ordered` | same columns and the same rows in the same order |
| `state` | after running both on fresh copies, `checkQuery` returns identical results (used for INSERT/UPDATE/DELETE and Redis/Mongo writes) |
| `custom` | `checkQuery` run after the learner's query returns a single truthy value |

Numbers are compared after normalising numeric strings (e.g. `DECIMAL` `"95000.00"` equals
`95000`). MongoDB `_id` values are ignored unless the lesson projects them.

### 4.4 Validation

`content-loader` validates front-matter with a schema (zod). A broken file shows an error card
in the sidebar instead of crashing the lab. `npm run check-content` loads every lab, runs each
solution against its dataset (browser engines in Node; real engines only with `--real`), and
exits non-zero on any failure.

### 4.5 v1 content (original)

| Lab | Lessons | Problems | Dataset(s) |
|---|---|---|---|
| SQL | ~60 across 11 chapters: Querying, Sorting, Filtering, Joins, Grouping, Subqueries, Set Operators, Modifying Data, CTEs, Advanced, Data Types & Constraints | 10 | `shop` (users, departments, employees, categories, suppliers, products, orders, reviews — original rows) |
| PostgreSQL | ~25: JSONB, arrays, `SERIAL` / identity, `RETURNING`, `UPSERT`, window functions, `generate_series`, indexes, `EXPLAIN`, views | 8 | `shop` + `events` (JSONB) |
| MongoDB | ~30: CRUD, query operators, projection, sort/limit, arrays, embedded docs, updates, aggregation (`$match $group $project $sort $lookup $unwind`), indexes (Real mode) | 8 | `store` (customers, products, orders with embedded items) |
| Redis | ~25: strings, keys and TTL, lists, hashes, sets, sorted sets, patterns (cache, counter, leaderboard, rate limiter); pub/sub (Real mode) | 6 | `app.redis` (seed commands) |

## 5. UI

### 5.1 Layout (matches the reference lab)

```
┌──────────────────────── Navbar 56px (surface 82% + backdrop blur, sticky) ─────────────────┐
│ Brand · SQL · PostgreSQL · MongoDB · Redis                         theme toggle             │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ Lab header: title + subtitle   [Lessons | Problems]   [Simulated | Real]*   Reset DB · Aa   │
├──────────────┬──────────────────────────────────────────────────────────────────────────────┤
│ Sidebar 300px│ Lesson flow (scrolls)                                                         │
│ collapsible  │  crumbs: Chapter · Lesson N                                                   │
│ to a rail    │  Title · explanation                                                          │
│ › CHAPTER    │  YOUR TURN · Task · Show hint                                                 │
│  1 Lesson    │  Editor (Monaco) ······································ Run ⌘↵               │
│  2 Lesson ✓  │  › Solution (Copy · Load into editor)                                         │
│              │  [Query Results | Schema] tabs · check result banner                          │
└──────────────┴──────────────────────────────────────────────────────────────────────────────┘
 * MongoDB and Redis only
```

Below 900px wide the sidebar becomes a slide-over drawer opened from a menu button.

### 5.2 Components

`Navbar`, `LabHeader`, `ModeTabs`, `EngineModeSwitch`, `Sidebar` (`Chapter`, `LessonItem`,
collapse rail), `LessonFlow`, `HintToggle`, `QueryEditor` (Monaco, token-themed, per-lab
language), `SolutionPanel`, `ResultsPanel` (table, error box, diff view), `CheckBanner`,
`SchemaViewer` (table/collection cards with PK/FK badges, sample data, relationships; key list
for Redis), `FontSizeSettings`, `ResetButton`, `ThemeToggle`.

### 5.3 Design tokens

`apps/web/src/styles/tokens.css` defines these variables under `:root, [data-theme="light"]` and
`[data-theme="dark"]`. `app.css` maps them into Tailwind v4 via `@theme inline` (e.g.
`--color-surface: var(--color-bg-secondary)`), and they are used as Tailwind utilities
(`bg-surface`, `text-muted`, `border-line`, `text-brand`). Tailwind keys use different names
from the tokens (e.g. `brand` for `--color-accent`, `ok` for `--color-success`) so a key never
refers to itself. Theme switching sets
`data-theme` on `<html>`; there are no `dark:` variants.

| Token | Light | Dark |
|---|---|---|
| `--color-bg-primary` | `#faf7f2` | `#111010` |
| `--color-bg-secondary` | `#ffffff` | `#181716` |
| `--color-bg-tertiary` | `#f3efe8` | `#1f1d1b` |
| `--color-bg-hover` | `#ece6dc` | `#272422` |
| `--color-bg-inverse` | `#1c1917` | `#f5f2ed` |
| `--color-text-inverse` | `#faf7f2` | `#111010` |
| `--color-text-primary` | `#1c1917` | `#f5f2ed` |
| `--color-text-secondary` | `#57534e` | `#a8a29e` |
| `--color-text-muted` | `#a8a29e` | `#6b6560` |
| `--color-border` | `#e7e0d5` | `rgba(255,255,255,.08)` |
| `--color-border-hover` | `#d6cdbf` | `rgba(255,255,255,.14)` |
| `--color-hairline` | `rgba(28,25,23,.08)` | `rgba(255,255,255,.06)` |
| `--color-overlay` | `rgba(28,25,23,.04)` | `rgba(255,255,255,.04)` |
| `--color-overlay-strong` | `rgba(28,25,23,.08)` | `rgba(255,255,255,.08)` |
| `--color-scrim` | `rgba(28,25,23,.45)` | `rgba(0,0,0,.6)` |
| `--color-accent` | `#f97316` | `#fb923c` |
| `--color-accent-hover` | `#ea580c` | `#fdba74` |
| `--color-accent-muted` | `rgba(249,115,22,.1)` | `rgba(251,146,60,.12)` |
| `--color-accent-border` | `rgba(249,115,22,.3)` | `rgba(251,146,60,.3)` |
| `--color-accent-glow` | `rgba(249,115,22,.18)` | `rgba(251,146,60,.22)` |
| `--color-success` / `-bg` / `-border` | `#15803d` / `#dcfce7` / `#bbf7d0` | `#4ade80` / `rgba(74,222,128,.12)` / `rgba(74,222,128,.3)` |
| `--color-error` / `-bg` / `-border` | `#b91c1c` / `#fee2e2` / `#fecaca` | `#f87171` / `rgba(248,113,113,.12)` / `rgba(248,113,113,.3)` |
| `--color-warning` / `-bg` / `-border` | `#a16207` / `#fef3c7` / `#fde68a` | `#fbbf24` / `rgba(251,191,36,.12)` / `rgba(251,191,36,.3)` |
| `--color-info` / `-bg` / `-border` | `#1d4ed8` / `#dbeafe` / `#bfdbfe` | `#60a5fa` / `rgba(96,165,250,.12)` / `rgba(96,165,250,.3)` |
| `--shadow-sm` | `0 1px 2px rgba(28,25,23,.05), 0 1px 3px rgba(28,25,23,.04)` | `0 1px 2px rgba(0,0,0,.3)` |
| `--shadow-md` | `0 2px 4px rgba(28,25,23,.05), 0 8px 20px -6px rgba(28,25,23,.12)` | `0 4px 12px -2px rgba(0,0,0,.4)` |
| `--shadow-lg` | `0 4px 8px rgba(28,25,23,.06), 0 20px 40px -12px rgba(28,25,23,.2)` | `0 16px 40px -12px rgba(0,0,0,.6)` |
| `--shadow-accent` | `0 8px 24px -8px rgba(249,115,22,.45)` | `0 8px 24px -8px rgba(251,146,60,.35)` |

The accent is a single token group (`--color-accent*`) so the brand colour can be changed in one
place before launch. The reference lab calls it `--color-orange-*`.

Theme-independent tokens:

| Group | Values |
|---|---|
| Fonts | sans `"Inter Variable", ui-sans-serif, system-ui, …`; mono `"JetBrains Mono Variable", ui-monospace, …` (self-hosted via `@fontsource-variable`) |
| Text sizes | xs `.6875rem`, sm `.8125rem`, base `.875rem`, md `.9375rem`, lg `1rem`, xl `1.125rem`, 2xl `1.25rem` (override Tailwind's defaults) |
| Weights | 400, 500, 600, 700 |
| Spacing | xs `.25rem`, sm `.5rem`, md `.75rem`, lg `1rem`, xl `1.5rem`, 2xl `2rem` (Tailwind `1 2 3 4 6 8`) |
| Radius | sm `6px`, md `8px`, lg `12px`, xl `16px`, full `999px` (override Tailwind's defaults) |
| Transitions | fast `.15s ease`, base `.2s ease`, normal `.25s ease`, slow `.3s ease` |
| Layout | `--navbar-height: 56px`; sidebar `300px` |
| Focus ring | `0 0 0 3px var(--color-accent-glow)` |
| z-index | navbar 1000, modal 2000, tooltip 3000 |

Monaco gets light and dark themes generated from these tokens.

## 6. Error handling

| Situation | Behaviour |
|---|---|
| Syntax or runtime error | Error box with the engine's message; Monaco marks the position when known |
| Wrong answer | "Not quite" banner; side-by-side expected vs actual with missing/extra rows highlighted |
| Query exceeds 5 s | PGlite runs in a Web Worker which is terminated and restarted; the simulators run in a worker too; the server cancels the operation. "Query timed out." |
| Destructive command in the sandbox | Allowed; a banner suggests "Reset DB" |
| Real mode unavailable | Switch disabled with "Run `docker compose up` to enable Real mode"; stays on Simulated |
| Server error mid-session | Error box; one automatic retry that creates a new session and replays setup |
| Invalid lesson file | Error card in the sidebar for that lesson; the rest of the lab loads |
| Dataset fails to load | Lab-level error screen with the dataset name and error, plus a Retry button |

## 7. Testing

- **Unit (Vitest):** content-loader parsing and validation; each check mode; the mongosh and
  redis-cli parsers; the Redis simulator per command group; result normalisation.
- **Engine contract tests:** one shared suite run against every Engine implementation
  (`setup → run → reset → snapshot → describe`).
- **Parity tests (`--real`, needs Docker):** the same queries on simulator vs real MongoDB and
  Redis must produce equal results; differences fail the run.
- **Content:** `npm run check-content`; runs in CI.
- **End-to-end (Playwright):** open each lab, run a correct and an incorrect query, hint,
  solution → load into editor, reset, theme toggle, sidebar collapse, mobile drawer.
- **CI (once the repo has a remote):** GitHub Actions running typecheck, unit, contract, content
  and e2e (parity job with service containers). Until then these run locally via npm scripts.

## 8. Delivery stages

Each stage gets its own implementation plan and ends with a working, tested app.

1. **Foundation + SQL lab:** monorepo, core types, content-loader, PGlite engine, the full UI
   with tokens and Tailwind, progress store, check-content, SQL lab content.
2. **PostgreSQL lab:** content and datasets (reuses the engine).
3. **MongoDB lab:** parser, simulator engine, server + Docker, remote engine, mode switch, content.
4. **Redis lab:** parser, simulator engine, server support, content.

## 9. Out of scope for v1 (designed for, not built)

- Accounts, login, sign-up (Clerk or similar later; `ProgressStore` gets a server implementation)
- Public hosting and deployment
- Step-through lesson animations (lesson format reserves an optional `animation:` field)
- AI tutor features
- Leaderboards, XP, streaks
- An in-app lesson editor (lessons are edited as files)

## 10. Open questions

- Brand name (placeholder "CodeAdda" until decided).
