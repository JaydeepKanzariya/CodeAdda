# Stage 2: PostgreSQL lab — design spec

Date: 2026-10-01
Status: approved in conversation; awaiting written review
Branch: `feature/stage-2-postgres-lab` (user commits; Claude never commits)

## 1. Goal

Add a second lab, **PostgreSQL**, that takes a complete beginner from "what is Postgres" to advanced, Postgres-specific features. Someone who already knows SQL can skip straight to the intermediate level. The lab reuses the existing in-browser Postgres engine (PGlite), lesson format, UI, grader and content checker.

Success looks like:
- `/postgres` opens a working lab with Lessons and LeetLab tabs, exactly like the SQL lab.
- 18 chapters, 46 lessons and 12 problems, grouped under Beginner, Intermediate and Advanced. 12 lessons have a "Watch it happen" animation.
- A learner with no SQL can start at lesson 1. A learner who knows SQL is offered a one-click jump to the first intermediate lesson.
- Every solution runs and every example returns real rows (`npm run check-content` is clean).
- On the home page, PostgreSQL becomes a live card, the navbar link becomes active, and "Coming soon" shows only MongoDB and Redis. No change to the SQL lab's content.
- The app still works offline; all existing tests stay green except the ones that change on purpose (§8.3).

## 2. Decisions already made

| Topic | Decision |
|---|---|
| Audience | Beginner to advanced, self-contained; a learner needs no prior SQL |
| Size | 46 lessons in 18 chapters, 12 problems (4 Easy, 4 Medium, 4 Hard) |
| SQL-savvy learners | Automatic "Already know SQL? Skip to Intermediate →" banner on the lab's first lesson |
| Beginner angle | Build-first: learners create and fill their own small tables, rather than querying a ready-made database. This complements the SQL lab instead of repeating it |
| Practice data | A new, original food-delivery dataset `food` (§5) |
| Animations | 12 "Watch it happen" lessons, chosen where seeing the effect helps (§4) |
| Approach | Content plus four small, data-driven code changes (§6). No new engine |
| Copy | Original. Nothing copied from ChaiCode or the PostgreSQL manual |

## 3. What already works without code

- The registry orders labs `sql → postgres → mongodb → redis` and loads every `content/*/lab.json`, so a new `content/postgres/` folder appears in the navbar, the home page grid and the footer automatically.
- `createEngine('sql')` serves any lab whose `lab.json` has `"language": "sql"`; the PostgreSQL lab uses it.
- `scripts/check-content.ts` already checks every lab with language `sql`.
- Schema panel, Reset DB, hints, solution panel, progress, drafts, LeetLab workspace, text-size menu and theme all work per lab.
- Home page: live-vs-soon cards, footer links and the labs headline/lead are already driven by the registry.

## 4. Course outline

`content/postgres/lab.json`:
- `id: "postgres"`, `title: "PostgreSQL Lab"`, `language: "sql"`
- `subtitle: "From your first table to JSONB and window functions"`
- `sidebarTitle: "The Postgres Path"`, `sidebarSubtitle: "Beginner to advanced, one query at a time"`
- `problemsSubtitle: "Practice problems on the food-delivery database"`
- `chapters`: the 18 titles below, in order
- `problemGroups: ["Warm-up", "Everyday Postgres", "Power features"]`
- `levels: [{ "title": "Beginner", "from": "Meet Postgres" }, { "title": "Intermediate", "from": "Joins and relationships" }, { "title": "Advanced", "from": "Arrays" }]`

✦ marks the 12 animated lessons.

### 4.1 Beginner: build your first database (6 chapters, 16 lessons)

| # | Chapter | Lessons |
|---|---|---|
| 1 | Meet Postgres | Your first query · Postgres as a calculator (expressions, `now()`) |
| 2 | Data types | Numbers (`integer`, `numeric`) · Text and casting (`::`) · Dates, times and booleans |
| 3 | Creating tables | `CREATE TABLE` · Changing a table (`ALTER TABLE`) · Removing a table (`DROP TABLE`) |
| 4 | Adding and reading data | `INSERT` · Filtering with `WHERE` · Sorting and limiting |
| 5 | Changing data | `UPDATE` · `DELETE` |
| 6 | Constraints | `NOT NULL` and `DEFAULT` · `UNIQUE` and `CHECK` ✦ · Primary and foreign keys ✦ |

Beginner lessons use the per-lesson `setup` field (an empty or tiny starting schema, e.g. a small `menu` table) instead of the `food` dataset. Lessons that create or change structure use `check: state` with a `checkQuery` that inspects what the learner built (e.g. columns from `information_schema.columns`, constraints from `information_schema.table_constraints`, rows from the table).

### 4.2 Intermediate: the everyday toolkit (6 chapters, 16 lessons)

| # | Chapter | Lessons |
|---|---|---|
| 7 | Joins and relationships | Inner join · Left join · Many-to-many through a join table ✦ |
| 8 | Aggregation | `COUNT` / `SUM` / `AVG` · `GROUP BY` and `HAVING` · Conditional totals with `FILTER` ✦ |
| 9 | Views | `CREATE VIEW` · Materialized views and `REFRESH` |
| 10 | RETURNING and UPSERT | `INSERT … RETURNING` ✦ · `UPDATE` / `DELETE … RETURNING` · `ON CONFLICT` ✦ |
| 11 | Identity and sequences | Identity columns vs `SERIAL` · Working with sequences |
| 12 | Dates and generate_series | `date_trunc` and intervals · `generate_series` · Filling gaps in daily totals ✦ |

### 4.3 Advanced: what makes Postgres special (6 chapters, 14 lessons)

| # | Chapter | Lessons |
|---|---|---|
| 13 | Arrays | Array columns and `ANY` · Containment (`@>`) and `unnest` ✦ |
| 14 | JSONB | Reading values (`->`, `->>`) ✦ · Searching (`@>`, `?`) · Building and updating (`jsonb_set`) |
| 15 | Window functions | `ROW_NUMBER` / `RANK` over partitions · Running totals ✦ · `LAG` and `LEAD` |
| 16 | Indexes and EXPLAIN | B-tree index and reading `EXPLAIN` ✦ · GIN index for JSONB and arrays |
| 17 | Transactions | `BEGIN` / `COMMIT` / `ROLLBACK` ✦ · Savepoints |
| 18 | Full-text search | `to_tsvector` / `to_tsquery` and `@@` · Ranking results with `ts_rank` |

Chapter titles in `lab.json` are plain text (no backticks): "RETURNING and UPSERT", "Dates and generate_series", "Indexes and EXPLAIN".

### 4.4 LeetLab problems (12)

- **Warm-up** (Easy ×4): single-table queries and simple filters on `food`
- **Everyday Postgres** (Medium ×4): joins, `FILTER`, `ON CONFLICT`, date bucketing
- **Power features** (Hard ×4): JSONB, arrays, window functions, a gap-filled report with `generate_series`

Each problem uses `dataset: food` (or a small inline `setup` where a problem needs its own table) and follows the SQL lab's problem format: difficulty, description, example, hints, solution.

### 4.5 Lesson format and writing rules

Same Markdown format as `content/sql` (front-matter, explanation, optional `## Watch it happen` YAML, `## Task`, `## Hint`, optional `## Example`, `## Solution`), so the README's "Add your own lesson" section applies unchanged. Files live at `content/postgres/lessons/<NN-chapter-slug>/<NN-lesson-slug>.md` and `content/postgres/problems/<NN-group-slug>/<NN-problem-slug>.md`; ids are unique within the lab.

Rules, learned from Stage 1:
- Hints point the way without giving the answer away.
- Every example runs and returns real rows from its dataset.
- Explanations use plain words for beginners; each lesson teaches one idea.
- Never use `now()`, `current_date`, `random()` or anything else that changes between runs in a checked answer. The lesson that introduces `now()` uses `check: custom` with a `checkQuery` such as `SELECT now()::date IS NOT NULL`.
- `EXPLAIN` lessons are never graded on plan text: they use `check: custom` with a `checkQuery` that confirms the index exists (`pg_indexes`), or grade a companion query's rows.
- Transaction lessons use `check: state` on the data after the learner's `BEGIN … COMMIT/ROLLBACK`.
- Rows-checked solutions return at least one row (the checker enforces this).

## 5. Dataset `food` (`content/postgres/datasets/food.sql`)

Original, made-up data; a friendly international mix of names (Indian, European, East Asian and others), like the SQL lab. All timestamps are fixed in March 2026; the schema uses `timestamp` (without time zone) so results never depend on the machine's time zone.

| Table | Rows | Columns |
|---|---|---|
| `customers` | ~15 | `id` identity PK, `name`, `email` UNIQUE, `city`, `joined_on date` |
| `restaurants` | ~8 | `id` identity PK, `name`, `city`, `cuisine`, `tags text[]`, `opening_hours jsonb` (nested by day), `rating numeric(2,1)` |
| `menu_items` | ~30 | `id` identity PK, `restaurant_id` FK, `name`, `price numeric(8,2) CHECK (price > 0)`, `tags text[]` (e.g. `{veg,spicy,bestseller}`), `available boolean DEFAULT true` |
| `riders` | ~5 | `id` identity PK, `name`, `vehicle`, `joined_on date` |
| `orders` | ~40 | `id` identity PK, `customer_id` FK, `restaurant_id` FK, `rider_id` FK nullable, `status text CHECK (status IN ('placed','delivered','cancelled'))`, `placed_at timestamp`, `total numeric(8,2)`, `details jsonb` (address with area and pincode, payment method, notes) |
| `order_items` | ~80 | `order_id` FK, `menu_item_id` FK, `quantity int CHECK (quantity > 0)`, PK (`order_id`, `menu_item_id`) |
| `reviews` | ~20 | `id` identity PK, `order_id` FK UNIQUE, `rating int CHECK (rating BETWEEN 1 AND 5)`, `body text` |

Deliberate details:
- Orders span three weeks of March 2026 with a few days that have no orders, so daily totals have gaps for `generate_series` to fill.
- Some orders are `cancelled` and some have no rider, for `FILTER` and `LEFT JOIN`.
- Review text includes words such as "spicy", "late", "cold", "fresh" and "crispy", so full-text search finds meaningful matches.
- Every table and key column has a `COMMENT ON`, so the schema panel shows descriptions like the SQL lab's.
- Inserts list columns explicitly and never rely on identity values in literals; foreign keys refer to ids in insert order (1…n), as in `shop.sql`.

## 6. Code changes

### 6.1 Levels in the sidebar

- `packages/content-loader/src/schema.ts`: `labJson` gains optional `levels: z.array(z.object({ title: z.string().min(1), from: z.string().min(1) })).optional()`.
- `packages/core/src/types.ts`: `Lab` gains optional `levels?: { title: string; from: string }[]`.
- `packages/content-loader/src/buildLab.ts`: passes `levels` through; adds a content error `levels: "<from>" is not a chapter` for each `from` that does not match a chapter title (case-sensitive). Invalid levels are dropped from the built lab.
- `apps/web/src/components/Sidebar.tsx` (Lessons tab only): before the first chapter of each level, render a small heading (`text-xs font-semibold uppercase tracking-wider text-muted`) with a coloured dot (green / amber / red for levels 1 / 2 / 3, using the `ok` / `warn` / `bad` token colours; a 4th+ level uses `brand`). Labs without `levels`, and the problems tab, render exactly as today.

### 6.2 "Skip to Intermediate" banner

- Shown in `LessonFlow` only when the lab has at least two valid levels **and** the current item is the lab's first lesson.
- Text: "Already know SQL? Skip to Intermediate →", where "Intermediate" is the second level's title and the target is the first lesson of the second level's `from` chapter (`itemPath(lab.id, 'lessons', id)`).
- Rendered with React Router `Link` (no page reload, the engine is not restarted). Styled as a quiet note (`border-note-line bg-note-bg text-note`, rounded, small text) above the lesson title area.

### 6.3 Header name

- `apps/web/src/components/LabHeader.tsx` `Wordmark`: merge into "SQLab" only when the head word is exactly `SQL` and the tail is `Lab`. "PostgreSQL Lab" renders "CodeAdda " + orange "PostgreSQL" + " Lab". "SQL Lab" still renders "CodeAdda SQLab".

### 6.4 Home page

- `apps/web/src/home/homeContent.ts` `LIVE_DESCRIPTIONS.postgres`: "From your first table to JSONB, window functions and indexes, all on a food-delivery database."
- Hero pill: becomes data-driven. One lab: unchanged ("SQL lab now open · {total} exercises"). Two or more: "{word} labs open · {sum of totals} exercises" using the existing number words (e.g. "Two labs open · 128 exercises"). Implemented as a pure helper `heroPill(labs: Lab[]): string` in `homeContent.ts`; no labs → "Labs opening soon".
- Hero headline, stats row and hero demo stay SQL-based (first registry lab).
- `UPCOMING_LABS` keeps all three names. `upcomingLabs()` already drops any name that is live, so PostgreSQL leaves "Coming soon" automatically; its `UPCOMING_COPY` entry stays (unused while the lab is live).

## 7. Error handling

- A broken lesson file shows the existing content-error message in the lab and is reported by `npm run check-content`; it never crashes the lab.
- A `levels.from` that matches no chapter is reported as a content error; the sidebar skips that heading and the skip banner uses only valid levels.
- With fewer than two valid levels, no skip banner is shown.
- Engine errors in Postgres lessons are shown the same way as in the SQL lab (error card with message and position).

## 8. Testing

### 8.1 Content

- `npm run check-content`: both labs report 0 problems (`postgres: 58 item(s) checked`).
- New `scripts/postgresLabShape.test.ts` (node), like `sqlLabShape.test.ts`: no content errors; the 18 chapter titles in order with their lesson counts (2,3,3,3,2,3 · 3,3,2,3,2,3 · 2,3,3,2,2,2); 46 lessons; 12 problems with difficulties 4 Easy / 4 Medium / 4 Hard in groups Warm-up / Everyday Postgres / Power features; exactly 12 lessons with `steps`; three levels whose `from` chapters exist; first lesson title "Your first query".
- New `scripts/foodDataset.test.ts` (node): loads `food.sql` into PGlite; asserts row counts per table, at least two dates in the March range with no orders, at least one cancelled order and one order without a rider, and that `to_tsvector('english', body) @@ to_tsquery('spicy')` matches at least one review.

### 8.2 Unit (Vitest)

- `buildLab.test.ts`: `levels` pass through; an unknown `from` produces a content error and is dropped.
- `Sidebar.test.tsx`: level headings render in order before the right chapters when `levels` is set; none render without `levels` or on the problems tab.
- `LessonFlow.test.tsx`: skip banner appears only on the first lesson of a lab with ≥2 levels, links to the first lesson of level 2, and is absent otherwise.
- `LabHeader.test.tsx`: "SQL Lab" → "CodeAdda SQLab"; "PostgreSQL Lab" → "CodeAdda PostgreSQL Lab" with "PostgreSQL" in the orange span.
- `homeContent.test.ts`: `heroPill` for 0, 1 and 2 labs; `LIVE_DESCRIPTIONS.postgres` exists.
- Updated on purpose: `registry.test.ts` "only SQL is live today" → SQL and PostgreSQL live, upcoming `['MongoDB','Redis']`; `HomePage.test.tsx` expectations for 2 live cards, 2 coming-soon cards and the new pill text.

### 8.3 E2E (Playwright, offline guard applies)

1. `/postgres` → first lesson "Your first query" → load solution → Run → "Correct!".
2. The skip banner on that lesson navigates to the first Intermediate lesson without a full page reload (assert a `window` marker set before the click survives).
3. A JSONB lesson (e.g. "Reading values") solves end to end.
4. Home page: the PostgreSQL card is a link to `/postgres`; "Coming soon" appears twice.
5. The full existing suite stays green.

## 9. Out of scope

- Level badges, per-level progress bars, lab landing pages, prerequisites (later, for all labs at once).
- Postgres extensions (`pgvector`, `citext`), server-side Postgres.
- Any change to the SQL lab's content or to the hero headline/demo.
- MongoDB and Redis labs (Stages 3 and 4).

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Beginner `state` checks are brittle (column order, type spelling like `int4` vs `integer`) | `checkQuery` selects normalised facts (`column_name`, `data_type`, ordered by name) rather than raw DDL; the checker runs every solution |
| `EXPLAIN` or plan output differs between runs | Never graded on plan text (§4.5) |
| Materialized views / `REFRESH`, savepoints, `generate_series` behave differently in PGlite | Each such lesson's solution is run by `check-content` on PGlite itself; any unsupported feature fails there and is rewritten before review |
| Hints give answers away | Per-chapter review pass checks every hint |
| Content copied from elsewhere | Originality rule in every writer brief; reviewer checks wording |
| Second lab breaks home page or registry tests | Those tests are updated on purpose (§8.2) and the home page logic was built for this |
| Large content volume | Written in chapter batches with check-content after each batch, as in Stage 1 |
