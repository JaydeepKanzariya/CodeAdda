# CodeAdda

Interactive labs for learning databases by writing real queries. Four labs are live:
- **SQL lab** (62 lessons across 11 chapters, plus 8 practice problems), running PostgreSQL in your browser via PGlite.
- **PostgreSQL lab** (46 lessons from beginner to advanced across 18 chapters, plus 12 practice problems), running real PostgreSQL in your browser via PGlite.
- **MongoDB lab** (40 lessons from beginner to advanced across 15 chapters, plus 12 practice problems), running an in-browser MongoDB engine via `@codeadda/engine-mongo-sim`.
- **Redis lab** (45 lessons across 15 chapters, plus 12 practice problems), running an in-browser Redis simulation engine via `@codeadda/engine-redis-sim`.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

`/` is the home page (the labs, how it works, and a live example); `/sql` opens the SQL lab; `/postgres` opens the PostgreSQL lab; `/mongodb` opens the MongoDB lab; `/redis` opens the Redis lab.
Everything runs in the browser, with no server and no account.

## Deploy to Vercel

This repository includes [vercel.json](./vercel.json) for the npm-workspaces monorepo. In Vercel, import the repository and keep the project root at the repository root; no separate root directory or environment variables are required.

The configuration runs `npm install`, builds with `npm run build`, serves `apps/web/dist`, and rewrites client-side routes to `index.html` so deep links to lessons and problems work after deployment.

## Checks

```bash
npm test             # unit and component tests (Vitest)
npm run typecheck    # TypeScript
npm run check-content  # runs every lesson/problem solution against its dataset
npm run e2e          # browser tests (Playwright; run `npx playwright install chromium` once)
```

## Add your own lesson

1. Each lab lives in its own folder (`content/sql/`, `content/postgres/`, `content/mongodb/`, `content/redis/`).
   Create a Markdown file under `content/<lab>/lessons/<NN-chapter>/<NN-slug>.md`
   (or `content/<lab>/problems/<group>/<NN-slug>.md` for a problem).
2. Start it with front-matter:

   ```yaml
   ---
   id: my-lesson            # unique, a-z 0-9 -
   title: My Lesson
   chapter: Filtering Data  # lessons: listed in "chapters" of content/<lab>/lab.json
                            # problems: listed in "problemGroups" of content/<lab>/lab.json
   order: 11                # position inside the chapter
   dataset: stream          # file in content/<lab>/datasets/ (without .json, .sql or .redis)
   check: rows-unordered    # rows-unordered | rows-ordered | state | custom
   # checkQuery: ...        required for state and custom (quote if contains braces)
   # difficulty: Easy       required for problems
   ---
   ```

   A lab's `lab.json` may list `levels` (`{ "title", "from" }`), which group its chapters under headings in the sidebar.

   Problems work the same way, but their `chapter` must be one of the `problemGroups` in
   `content/<lab>/lab.json` (not `chapters`), and they must set `difficulty` (Easy | Medium | Hard). Problems may optionally include a self-contained dataset in a `## Setup` block (JSON for MongoDB, commands for Redis).

3. Then write: an explanation, `## Task`, `## Hint` (bullets), optional `## Example`,
   and `## Solution` with a ```sql, ```js/```mongodb or ```redis code block.
4. Save — the dev server shows it immediately. Run `npm run check-content` to verify the
   solution works.

Check modes: `rows-unordered` compares result documents/rows in any order; `rows-ordered` also checks
order; `state` runs `checkQuery` after your query and after the solution and compares those;
`custom` passes when `checkQuery` returns a true first value.

## MongoDB Lab & Engine

The MongoDB lab runs client-side using `@codeadda/engine-mongo-sim`, a browser-safe MongoDB simulation engine powered by `mingo` with custom MongoDB-compliant `$bucket` semantics and canonical column ordering (`_id` first, alphabetical attributes).

### Supported `mongosh` subset
- **Queries & Find:** `db.<collection>.find(filter?, projection?)`, `db.<collection>.findOne(filter?, projection?)`
- **Cursor methods (after `find`):** `.sort({...})`, `.skip(n)`, `.limit(n)`, `.pretty()`, `.toArray()` (applied as sort → skip → limit)
- **Counting & Distinct:** `db.<collection>.countDocuments(filter?)`, `db.<collection>.distinct(field, filter?)`
- **Mutations:** `db.<collection>.insertOne(doc)`, `db.<collection>.insertMany([doc, ...])`, `db.<collection>.updateOne(filter, update)`, `db.<collection>.updateMany(filter, update, { arrayFilters }?)`, `db.<collection>.replaceOne(filter, doc)`, `db.<collection>.deleteOne(filter)`, `db.<collection>.deleteMany(filter)`
- **Aggregation stages:** `$match`, `$project`, `$group`, `$sort`, `$limit`, `$skip`, `$unwind`, `$lookup`, `$bucket`, `$cond`, `$switch`, `$addFields`, `$replaceRoot`, `$facet`
- **Update operators:** `$set`, `$unset`, `$inc`, `$push`, `$pull`, `$addToSet`, `$pop`, `$min`, `$max`, `$mul`, `$rename`
- **Query operators:** Comparison (`$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`), Logical (`$and`, `$or`, `$nor`, `$not`), Element (`$exists`, `$type`), Array (`$elemMatch`, `$size`, `$all`), Evaluation (`$regex`, `$expr`)
- **Safety:** Sandboxed JSON-like AST query reader; blocks code-executing operations (`$where`, `$function`), out-of-browser side effects (`$out`, `$merge`), upserts and pipeline-style updates. Field paths through `__proto__`, `constructor` or `prototype` are rejected.
- **Differences from real MongoDB:** an inserted document without `_id` gets the next integer (highest numeric `_id` + 1) instead of an ObjectId, so answers are reproducible; dates are ISO strings; whole-sub-document equality ignores key order.

### Dataset format
MongoDB datasets are stored under `content/mongodb/datasets/<name>.json` as an object mapping collection names to document arrays, plus an optional `"_meta": { "descriptions": { "<collection>": "..." } }` shown in the schema panel:
```json
{
  "movies": [
    { "_id": 1, "title": "Echoes of Silence", "year": 2024, "genres": ["Sci-Fi", "Drama"] }
  ],
  "users": [
    { "_id": 101, "name": "Amina Al-Mansoor", "plan": "premium" }
  ]
}
```

## Redis Lab & Engine

The Redis lab supports the command families used by the curriculum: generic keyspace
commands, strings and counters, hashes, lists and blocking-list forms, sets, sorted
sets, bitmaps, HyperLogLog, Streams and consumer groups, transactions and optimistic
locking, and the whitelisted `CONFIG GET`/`CONFIG SET` commands. It teaches Redis 7 forms first
(`ZRANGE … REV | BYSCORE | LIMIT`, `LMOVE`, `SET … NX EX`) and still accepts the legacy ones
(`ZREVRANGE`, `RPOPLPUSH`, `HMSET`). Unsupported commands (Lua, Pub/Sub, `SHUTDOWN`, …) answer with a
clear message instead of failing.

The simulator is intentionally deterministic and browser-safe. Its clock is frozen at
`2026-01-01T00:00:00Z`; HyperLogLog is exact rather than probabilistic; blocking
`B*` commands return immediately with a notice; `CONFIG` stores the selected settings
but does not evict keys; and lines beginning with `#` are comments. These differences
are called out in the relevant lessons.

Lessons that change data are graded with `checkQuery: SNAPSHOT <glob> [glob …]`, a command that only
checks can run. It lists every matching key with its type, TTL and value, so a missing TTL or a wrong
key fails the check. Replies are canonical (sorted sets and hashes are ordered), so any member order passes.

Redis datasets use one command per line in `content/redis/datasets/*.redis`. The seed
supports normal Redis CLI quoting plus schema descriptions such as:

```text
# @describe user:* Registered ArcadePulse player profiles
HSET user:101 name Amina tier pro
```

## Layout

- `apps/web` — React + Vite + Tailwind UI with dynamic lab routing, dual Table/Documents results views, Monaco editor
- `packages/core` — shared types, recursive document/result comparison, grader
- `packages/content-loader` — Markdown lessons → lab data compiler with YAML parser & animated step validator
- `packages/engine-pglite` — PostgreSQL (PGlite) engine
- `packages/engine-mongo-sim` — MongoDB engine with mingo, safe AST parser, and `$bucket` rewriter
- `packages/engine-redis-sim` — browser-safe Redis simulation engine
- `content/` — labs, lessons, problems and datasets (`sql`, `postgres`, `mongodb`, `redis`)
- `docs/superpowers/` — design specs and implementation plans

Lab content is bundled per lab and loaded on-demand when the lab is opened; the home page only gets a small summary of each lab. The entry bundle stays small because each lab is prebuilt to plain data at build time (the content parser never ships to the browser); check `index-*.js` in `npm run build -w @codeadda/web` after content-pipeline changes.
