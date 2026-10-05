# Stage 3: MongoDB Lab — Design Spec (v2)

- **Date:** 2026-10-05
- **Status:** Revised after review in Claude Code (v1 draft replaced). Decisions below are approved.
- **Branch:** `feature/stage-3-mongodb-lab` (user commits; implementers never commit)

## 1. Goal

Add the third lab, **MongoDB**, at `/mongodb`. It takes a learner from "what is a document?" to aggregation pipelines and joins, entirely **in the browser and offline**, on a new in-browser engine `@codeadda/engine-mongo-sim` built on `mingo`. A learner who already knows the basics can skip to the intermediate level.

### Success criteria
1. `/mongodb` opens a lab with **Lessons** and **LeetLab** tabs, same layout and tokens as the SQL and PostgreSQL labs.
2. **15 chapters, 40 lessons, 12 problems** (4 Easy, 4 Medium, 4 Hard) in three levels with the skip banner; **10** lessons animated.
3. Queries use `mongosh` syntax (`db.movies.find({ genres: "Sci-Fi" })`, `db.movies.aggregate([...])`, `db.users.updateOne(...)`).
4. **Correct answers are never failed for MongoDB-irrelevant differences**: field order, key order inside sub-documents, or an omitted `_id` value that the engine generates.
5. Results show as a **Table** (default) or **Documents** (formatted JSON), toggled in the Results panel.
6. The schema panel lists **collections** with document counts, fields, detected types and a working **View sample data**.
7. `npm run check-content` checks **52** MongoDB items (plus 70 SQL + 58 PostgreSQL) with 0 problems.
8. Home page: MongoDB becomes a live card, navbar link becomes active, only Redis stays "Coming soon". The home page entry bundle does **not** grow (the engine and lab content load on demand).
9. All existing tests stay green; the app stays fully offline.

## 2. Decisions

| Topic | Decision | Why |
|---|---|---|
| Engine | `@codeadda/engine-mongo-sim` on **mingo 7.2.4** (latest, verified 2026-10-05) | Real MongoDB query/aggregation/update semantics in JS; no server; instant reset |
| Real MongoDB (Docker) | Deferred to a later stage | Keeps Stage 3 offline and dependency-free |
| Engine routing | A **per-language engine registry** (worker file per engine; Node map for scripts) | MongoDB doesn't download Postgres code; Redis later is one more entry |
| Syntax | A safe **mongosh subset** parsed by a recursive-descent parser — plain values only, no `eval`, no functions | Natural syntax, no code execution |
| `$bucket` | **Our own implementation** (rewritten to `$group` + `$switch` before mingo runs) | mingo 7.2.4 `$bucket` is wrong at boundaries (verified: 2000 lands in the 1990 bucket; real MongoDB uses `[lower, upper)`) and outputs empty buckets that MongoDB omits |
| Chapter 15 | **Reshaping Documents** (`$addFields`/`$set` stage, `$replaceRoot`, `$facet`) replaces "Collections & Schemas" | mingo has no `createCollection`; `$jsonSchema` needs a separate validator library (a second dependency) |
| Dataset | **Fictional** streaming catalog `stream` — invented titles, people and scores | Original content, safe to publish, nothing goes out of date; no trademarked characters |
| Generated `_id` | **Deterministic**: next integer after the collection's highest numeric `_id` (1 if none) | Random ids would make every insert check fail |
| Column order | **Canonical**: `_id` first, then the other top-level fields sorted A→Z | The grader compares columns in order; MongoDB field order is not meaningful |
| Nested values | Compared with **keys sorted recursively** | `{a:1,b:2}` equals `{b:2,a:1}` |
| Dates | Stored as ISO-8601 strings (JSON has no date type) | Curriculum has no date operators; strings sort correctly |
| Blocked features | `$where`, `$function`, `$accumulator` (code execution), `$out`, `$merge` (writes from a pipeline), `upsert`, pipeline-style updates | Safety and a predictable sandbox; each gives a clear "not supported in this lab" message |
| Editor | Monaco `javascript` mode with the TypeScript worker, **diagnostics off** | JS highlighting without red squiggles under `db`; worker loads only in the MongoDB lab |

## 3. Engine

### 3.1 Package `packages/engine-mongo-sim`
`MongoSimEngine implements Engine` (`kind = 'mongodb'`, `mode = 'browser'`).

- **State:** `Map<string, Doc[]>`; `setup(dataset)` parses the dataset JSON and deep-clones it into a pristine copy; `reset()` restores from the pristine copy.
- **Dataset format:** a JSON object whose keys are collection names and values are arrays of documents. An optional top-level `"_meta": { "descriptions": { "<collection>": "…" } }` gives schema-panel descriptions and is not a collection.
- **`run(query)`:** parse → validate (blocked operators) → execute → format. Errors return `{ ok: false, error: { message, position? } }` (parser errors carry the character position).
- **`snapshot(query)`:** same as `run` (used for `state` checks; check queries are reads).
- **`describe()`:** one `TableInfo` per collection: `rowCount` = documents, columns = union of top-level fields with detected type (`string`, `number`, `boolean`, `array`, `document`, `null`, or `mixed`), `nullable` = field missing or null in some document, `isPrimary` = `_id`, `isForeign` = false, `sampleQuery` = `db.<name>.find().limit(3)`, description from `_meta`. `relationships: []`.

### 3.2 Supported mongosh subset
- Statement: `db.<collection>.<method>(<args>)` with optional cursor chain after `find` only: `.sort(spec)`, `.skip(n)`, `.limit(n)`, `.pretty()`, `.toArray()` (the last two are no-ops). Sort → skip → limit are applied in that order whatever the written order (server semantics). A trailing `;`, whitespace, `//` and `/* */` comments are allowed.
- Methods: `find`, `findOne`, `aggregate`, `countDocuments`, `distinct`, `insertOne`, `insertMany`, `updateOne`, `updateMany`, `replaceOne`, `deleteOne`, `deleteMany`.
- Values: objects (quoted or bare keys, keys may start with `$`; quoted keys may contain dots), arrays, strings (`'…'` or `"…"` with escapes), numbers (negative, decimal, exponent), `true`, `false`, `null`, regex literals `/…/flags`, trailing commas. **Anything else** (`new`, `ISODate`, `function`, `=>`, identifiers, template strings) is a syntax error that says what is allowed.
- A missing collection reads as empty; inserting into it creates it.

### 3.3 Result shapes (all produce `columns` + `rows`; reads also return `documents`)
| Call | Rows / documents |
|---|---|
| `find`, `findOne`, `aggregate` | the documents (deep-cloned) |
| `countDocuments(filter)` | one row `{ count: n }` |
| `distinct(field, filter?)` | one row per value `{ value }`, arrays flattened like MongoDB, sorted ascending (numbers numerically, strings lexicographically) |
| `insertOne` | `{ acknowledged: true, insertedId }` |
| `insertMany` | `{ acknowledged: true, insertedCount, insertedIds }` |
| `updateOne`/`updateMany`/`replaceOne` | `{ acknowledged: true, matchedCount, modifiedCount }` |
| `deleteOne`/`deleteMany` | `{ acknowledged: true, deletedCount }` |

`columns` are canonical (`_id` first, rest A→Z); a field missing from a document is `null` in that row.

### 3.4 Correct `$bucket`
Before calling mingo, each `$bucket` stage is rewritten to: `$group` keyed by a `$switch` over `[boundaries[i], boundaries[i+1])` (default bucket = `default`, or a sentinel if none), output fields from `output` (default `{ count: { $sum: 1 } }`), then sorted by boundary with the default bucket last. If a value falls outside the boundaries with no `default`, the query fails with MongoDB's message ("$bucket could not find a matching branch…"). Boundaries must be ascending with at least two values. Only buckets with at least one document are returned (MongoDB behaviour).

### 3.5 Writes
- `insertOne`/`insertMany`: missing `_id` → deterministic next integer; duplicate `_id` → error `E11000 duplicate key error: _id <value> already exists`.
- `updateOne`/`updateMany`: operator updates via `mingo/updater` (`$set`, `$unset`, `$inc`, `$push`, `$pull`, `$addToSet`, positional `$`, etc.). A replacement document without operators is an error ("Use replaceOne to replace a whole document, or an update operator such as $set"). `upsert` and pipeline updates are blocked.
- `replaceOne(filter, doc)`: replaces the first match, keeping its `_id`.
- `deleteOne`/`deleteMany`: remove matching documents.

### 3.6 Grader change (core)
`normalizeCell` sorts object keys recursively before serialising, so nested values compare key-order-independently. `QuerySuccess` gains `documents?: unknown[]`. No other grader change (the canonical column order comes from the engine).

## 4. Web integration
- **Engine registry:** `createEngine(language)` maps `sql` → `engine.worker.ts` (PGlite) and `mongodb` → new `mongo.worker.ts`. Both workers share one `serveEngine(engine)` helper. Each worker is its own chunk, so a lab only downloads its own engine.
- **Language UI config** `labUi(language)` (one place, used everywhere a label is language-specific):

| | `sql` | `mongodb` |
|---|---|---|
| Monaco language | `sql` | `javascript` |
| Editor title | SQL editor | MongoDB shell |
| Starter text | `-- Write your SQL query here` | `// Write your MongoDB query here` |
| Skip prompt | Already know SQL? | Already know the MongoDB basics? |
| Problems sidebar subtitle | Original SQL challenges, easy to hard | Original MongoDB challenges, easy to hard |
| Schema unit | rows | documents |

- **Monaco:** `monacoSetup.ts` returns the TypeScript worker for the `typescript`/`javascript` labels and the editor worker otherwise; JavaScript diagnostics are turned off (`noSemanticValidation`, `noSyntaxValidation`) so learners see no false errors.
- **Results panel:** when a result has `documents`, a segmented `Table | Documents` control appears (default Table; choice kept while the lab is open). Documents view: one card per document, pretty-printed JSON in the mono font, keys in document order, long results scroll inside the panel.
- **Schema panel:** shows "N documents" and lowercase types for MongoDB; `_id` keeps the PK badge; View sample data runs `sampleQuery`.
- **Home page:** `LIVE_DESCRIPTIONS.mongodb`; generic copy that still says "Postgres"/"SQL" where it means "the database" becomes database-neutral (the SQL-themed hero stays). `UPCOMING_LABS` unchanged (live labs drop out automatically).
- **Content checker:** a Node engine map `{ sql: PgliteEngine, mongodb: MongoSimEngine }` replaces the `language !== 'sql'` skip.

## 5. Dataset `stream` (`content/mongodb/datasets/stream.json`)
Fictional streaming platform "Reelhouse". All titles, people, emails and scores are invented.

| Collection | Docs | Fields |
|---|---|---|
| `movies` | 20 | `_id` (1–20), `title`, `year`, `runtime`, `genres` (array), `details` `{ director, country, language }`, `cast` (array of `{ actor, role }`), `ratings` `{ critics, audience }` (critics 0–100, audience 0–10) — `ratings.critics` missing on 2 films, `tags` array on some films only |
| `users` | 12 | `_id` (101–112), `name`, `email`, `plan` (`free` / `basic` / `premium`), `joined_on`, `preferences` `{ favorite_genres: [...], max_rating }` (missing on 1 user) |
| `reviews` | 25 | `_id` (501–525), `movie_id`, `user_id`, `rating` (1–10), `comment`, `posted_at` |
| `watch_history` | 36 | `_id` (901–936), `user_id`, `movie_id`, `watched_at`, `duration_mins`, `completed` |
| `_meta` | — | descriptions for the four collections |

Deliberate facts (each lesson/problem relies on one): release years span 1994–2024 and include films in **exactly** 2000 and 2010 (proves `$bucket` boundaries); at least 3 films under 100 minutes; at least 2 films with both `Action` and `Adventure`; one actor appears in 3 films; one director has 3 films; at least 3 films have no reviews (empty `$lookup`); some review comments contain "twist" and "slow" (case varies, for `$regex`); `watch_history` has incomplete views over 120 minutes for user 101; scores give no ties at the top of any sorted lesson.

## 6. Course outline
`content/mongodb/lab.json`: `id "mongodb"`, `title "MongoDB Lab"`, `language "mongodb"`, subtitle "From your first document to queries, updates and aggregation", sidebarTitle "The MongoDB Path", sidebarSubtitle "Beginner to advanced, one document at a time", problemsSubtitle "Practice problems on the Reelhouse streaming database", problemGroups `["Warm-up", "Everyday MongoDB", "Aggregation & Power"]`, levels: Beginner from "Meet Documents", Intermediate from "Complex Queries", Advanced from "Aggregation Pipeline". ✦ = animated.

| Level | # | Chapter | Lessons |
|---|---|---|---|
| Beginner | 1 | Meet Documents | Your first find · Matching an exact value |
| | 2 | Projections & Limits | Choosing fields with a projection · Limiting and skipping · Sorting results ✦ |
| | 3 | Comparison Operators | Greater and less than · Ranges with $gte and $lte · Lists with $in and $nin |
| | 4 | Inserting Data | Inserting one document · Inserting many documents · Choosing your own _id |
| | 5 | Updating & Deleting | Changing fields with $set and $unset ✦ · Deleting documents |
| Intermediate | 6 | Complex Queries | Combining conditions with $or and $and ✦ · Checking a field exists · Matching text with $regex |
| | 7 | Embedded Documents | Dot notation ✦ · Matching a whole sub-document · Updating nested fields |
| | 8 | Array Queries | Matching an array value · Requiring several values with $all · Matching array objects with $elemMatch ✦ |
| | 9 | Array Updates | Adding with $push and $addToSet · Removing with $pull ✦ · The positional $ operator |
| | 10 | Counting & Distinct | Counting documents · Distinct values |
| Advanced | 11 | Aggregation Pipeline | $match and $project ✦ · Grouping with $group ✦ · Sorting and limiting in a pipeline |
| | 12 | Reshaping Arrays | Unwinding arrays ✦ · Collecting with $addToSet · $filter and $size |
| | 13 | Multi-Collection Lookups | Joining with $lookup ✦ · Flattening joined arrays · Lookups with a pipeline |
| | 14 | Conditional Expressions | $cond and $switch · Grouping into ranges with $bucket |
| | 15 | Reshaping Documents | $addFields and $replaceRoot · Several summaries at once with $facet |

**LeetLab** (each problem has its own small `## Setup` dataset, like the SQL/PostgreSQL problems):
- **Warm-up (Easy):** Top-rated sci-fi · Short features · A director's films · Premium subscriber count
- **Everyday MongoDB (Medium):** Critics' and audience favourites · Action-adventure picks · Find a cast member · Mark long views complete
- **Aggregation & Power (Hard):** Genre scorecard · Reviewer summary ($lookup) · Films per decade · Binge-watch leaderboard

## 7. Quality rules (carried from Stage 2)
Every lesson: explanation directly after front-matter (before the first `##`); `## Setup` (if any) last; `## Context` with a runnable example on different data or a different question; hints point the way without the full solution; tasks state fields, aliases and order but not the exact expression; rows-checked solutions return ≥1 row; `state` checks read the affected collection sorted by `_id` and fail a no-op; animations use real rows; original text, no "Chai".

## 8. Verification
- Unit: parser, engine (each method, result shapes, canonical columns, deterministic ids, blocked operators, `$bucket` boundaries, describe), core compare (nested key order), worker routing, `labUi`, results toggle, schema unit.
- Content: `check-content` 52/52; `mongoLabShape.test.ts`; `streamDataset.test.ts` (facts in §5); `mongoChecks.test.ts` (no-op fails every state lesson; reordered-field answers pass).
- E2E (offline): first lesson solves; skip banner jumps to Complex Queries without reload; Table/Documents toggle; schema sample data; a `$lookup` lesson solves; home page shows MongoDB as a link and only Redis as coming soon; `/` still downloads no lab content.

## 9. Out of scope
Real MongoDB/Docker mode, indexes and `explain()`, transactions, change streams, `$jsonSchema` validation, date operators, Redis (Stage 4).
