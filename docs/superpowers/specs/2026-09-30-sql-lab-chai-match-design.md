# SQL Lab: match labs.chaicode.com/sql, design spec

Date: 2026-09-30 · Status: draft for review · Builds on: `2026-09-29-codeadda-design.md`

## 1. Goal

Make our SQL Lab look and behave like labs.chaicode.com/sql. Put the same page next to the
reference screenshots and it should look the same, **except for the words**.

**Decided (Option A):** we copy the layout, styling and structure: the chapter order, lesson
order, lesson titles and LeetLab groups. **All prose, step scripts and problems stay original.**
We keep our own branding ("CodeAdda", "SQL Lab"), so the lab stays safe to publish.

Reference: the 7 screenshots from 2026-09-29, plus the outline in `D:\Jaydeep\chai\chai_sql_content.md`
(used for structure only).

### Success criteria
- Every element in section 3 appears, in the same position and style as the screenshots, in light and dark themes.
- The sidebar shows exactly 11 chapters and 62 lessons, in ChaiCode's order and with their titles.
- The 22 lessons listed in 5.3 have a working "Watch it happen" player. Their sidebar rows show the ▸ marker.
- LeetLab shows 3 groups (SELECT 5, Basic Joins 2, Easy Challenges 1) of original problems.
- Typecheck, unit tests, `check-content` and e2e all pass.

### Not in scope
- ChaiCode's brand name or logo, and the "Do not Click" tab.
- Their HTML/CSS/JS/Python playgrounds. Our top bar links to our own labs instead.
- Stages 2–4 (PostgreSQL, MongoDB, Redis).
- Commits. The user's rule is development only.

## 2. Approach

This keeps the current architecture (React + Vite + Tailwind v4 tokens, PGlite worker, Markdown
content). Three kinds of change:

1. **UI restyle.** Existing components are reshaped to match, and a few new ones are added (section 3).
2. **Content format additions.** Two new optional lesson sections, `## Context` and
   `## Watch it happen` (section 4). Column and relationship descriptions come from SQL comments.
3. **Content restructure.** Lessons are reordered, renamed, rewritten and added, and problems are regrouped (section 5).

The animation is **data-driven**: every lesson's step script lives in its `.md` file, and one
`StepPlayer` component draws all of them. That keeps the 22 animations visually identical and lets
authors add new ones without writing code.

## 3. UI (match the screenshots)

### 3.1 Top bar (`Navbar`)
- On the left, our logo mark and **CodeAdda**.
- In the centre, lab links: **SQL Lab** (active: orange text on an orange-muted pill), **PostgreSQL**,
  **MongoDB** and **Redis**. Labs that aren't built yet are shown muted and disabled, with a "Soon" tooltip.
- On the right, a square theme-toggle button with a moon or sun icon, and a small decorative avatar mark.
- 56px tall, white background, bottom hairline.

### 3.2 Lab header (`LabHeader`)
- On the left, the wordmark **SQL**ab: "SQL" in orange, then "Lab", plus the subtitle *Learn SQL, one query at a time* in muted text.
- In the centre, a segmented control with **Lessons | LeetLab** (the active segment is a white pill with a border).
- On the right, **⟲ Reset DB** (an outlined button) and **Aᴬ** (the existing font-size menu).
- The current `ModeTabs` moves from the right side to the centre, and "Problems" is renamed "LeetLab".

### 3.3 Sidebar (`Sidebar`)
- About 300px wide. The collapse handle (‹) sits on the sidebar's right edge, vertically centred, as in the screenshots.
- Header: **The SQL Codex**, with *Begin your journey as a Data Architect* below it. For LeetLab: **LeetLab**
  with *Original SQL challenges, easy to hard*.
- Chapter heading: a chevron plus the name in small grey caps. **All chapters start expanded.**
- Lesson row:
  - A 20px circle badge with the global lesson number: a tertiary grey background normally, and a filled orange background with white text when active.
  - The lesson title.
  - A small orange ▸ on the right if the lesson has a "Watch it happen" script.
  - Active row: accent-muted background. Hovered row: `bg-hover`.
  - A completed lesson shows a ✓ in place of its number, keeping the current progress behaviour.
- The sidebar scrolls independently of the page.

### 3.4 Lesson column (`LessonFlow`), top to bottom
1. **Header.** A monospace muted breadcrumb (`Querying Data · Lesson 1`), a large bold title (about 30px), and the
   lesson intro as a secondary-colour paragraph (max width about 760px).
2. **WATCH IT HAPPEN.** Shown only when the lesson has a script. An orange caps label, the subtitle
   *Play it through, or step back and forth yourself.*, then `StepPlayer` (section 6).
3. **YOUR TURN.** An orange caps label, then:
   - The **Context** box: white, with a 3px orange left border and secondary-colour text.
   - The **Task** box: orange-muted background, orange left border, and **Task:** in orange followed by the task text.
4. **Hint.** A small outlined **Show hint / Hide hint** button. The revealed hint sits in a bordered grey box.
5. **SQL EDITOR card.** Header label *SQL EDITOR* on the left and an orange **▶ Run Query ⌘↵** button on
   the right (with a keyboard-shortcut chip). Monaco sits below it, with orange line numbers and keywords as in the screenshots.
6. **Solution.** A collapsible row (`⌄ Solution … hide`). Inside: a code box, then **Copy** and
   **Load into editor** (orange-outlined) buttons. Starts collapsed.
7. **Check banner.** Unchanged: it shows pass or fail after a run.
8. **Output card.** Tabs **Query Results `(n)`** (with a count chip) and **Database Schema**. The active tab has an orange underline.
   The empty state reads *Run a query to see results*.
9. **Database schema.** A collapsible section below the output card, using a `⌄ Database schema` pill button and
   starting open. It contains a card titled **Database Schema** / *Explore the tables and their structure*,
   which scrolls internally (max height about 420px):
   - One accordion per table: a monospace name, the description, and *N rows*, with a ▾/▴ toggle.
   - When open, a *COLUMNS* label and a table with NAME (plus a yellow **PK** badge or blue **FK** badge), TYPE
     (monospace, uppercase, e.g. `VARCHAR(100)`) and DESCRIPTION, then a **View Sample Data** button.
   - A **TABLE RELATIONSHIPS** block: one row per foreign key, with an orange left border,
     `from → to` chips, a muted kind (`(many-to-one)` or `(self-reference)`) and a description line.

### 3.5 Styling
- The existing tokens (`tokens.css`) already match ChaiCode's palette. No new colours, except
  `--color-grid` for the player's graph-paper background and a green or red cell tone that reuses the success and error tokens.
- Inter for UI text, and a monospace font for code, breadcrumbs, table names and player tables.
- Dark mode must keep working for every new element.

## 4. Content format additions

### 4.1 `## Context` (optional, lessons)
Plain Markdown shown in the Context box. If it's missing, the Context box is hidden.

### 4.2 `## Watch it happen` (optional, lessons)
A single fenced `yaml` block, parsed and checked with zod:

```yaml
tables:                         # tables available to the steps, in draw order
  users:
    columns: [id, name, age, country]
    rows:
      - [1, Alice Johnson, 28, USA]
      - [2, Bob Smith, 35, Canada]
  result:
    label: result               # optional caption above the card (default: the key)
    columns: [name, country]
    rows: [[Alice Johnson, USA], [Bob Smith, Canada]]
steps:
  - label: A table              # short text under the progress bar
    caption: This is a table called `users`. Across is a **column**, down is a **row**.
    show: [users]               # tables visible on this step (default: all)
    highlight:                  # optional
      - { table: users, row: 2, tone: focus }          # 1-based row
      - { table: users, column: age, tone: focus }
      - { table: users, cell: [1, name], tone: removed }
    dim: [{ table: users, rows: [3, 4] }]            # optional, greyed out
    labels: { users: "users -- rejected" }           # optional per-step caption override
    notes:                      # optional callouts drawn to the right of the tables
      - { title: "2 rows × 4 columns", text: "Every value sits in one row and one column.", tone: info }
```

- **Tones:** `focus` (orange), `kept` (green), `removed` (red), `info` (blue, notes only).
- The caption is inline Markdown: code, bold and italic.
- **Validation** is reported like any other content error, with the file path and message:
  - Every table referenced must exist, and so must every column.
  - Row numbers must be within range, and every row must have as many values as there are columns.
  - There must be at least 2 steps and at most 8.

### 4.3 Schema descriptions
- `shop.sql` gains a `COMMENT ON COLUMN` for every column. Each foreign key is named and gets a
  `COMMENT ON CONSTRAINT … IS 'Each employee works in one department'`.
- `engine-pglite`'s `describe()` reads the comments, and `ColumnInfo` gains `description?`.
  `Relationship` gains `description?` and `kind: 'many-to-one' | 'self-reference'`. The kind is
  `self-reference` when the source and target tables are the same.
- Table and column types are shown in uppercase with length or precision, e.g. `VARCHAR(100)` and `DECIMAL(10,2)`.
  `SERIAL` is shown for integer columns whose default is a sequence.

### 4.4 Lesson file shape after rewrite
```
---  front-matter (unchanged fields; title = ChaiCode's short title) ---
<intro: 1–2 sentences, shown under the title>
## Watch it happen   (22 lessons only)
## Context
## Task
## Hint
## Solution
```

## 5. Content restructure

### 5.1 Chapters (`lab.json`)
Querying Data · Sorting Data · Filtering Data · Joining Tables · Grouping Data · Subqueries ·
Set Operators · Modifying Data · Common Table Expressions · **Advanced Topics** (renamed from
Advanced Queries) · Data Types & Constraints.

`problemGroups`: **SELECT · Basic Joins · Easy Challenges**.

### 5.2 Lessons (62). Titles become ChaiCode's short titles, and prose is rewritten to the 4.4 shape.
| # | Title | Source file |
|---|---|---|
| 1–5 | SELECT All Columns · SELECT Specific Columns · SELECT with DISTINCT · LIMIT Results · Column Aliases with AS | 01-querying/01–05 |
| 6–8 | ORDER BY Ascending · ORDER BY Descending · ORDER BY Multiple Columns | 02-sorting/01–03 |
| 9–18 | WHERE Clause · Comparison Operators · WHERE with AND · WHERE with OR · IN Operator · NOT IN Operator · BETWEEN Operator · LIKE Pattern Matching · IS NULL · IS NOT NULL | 03-filtering/01–10 |
| 19–25 | Table Aliases · INNER JOIN Basics · LEFT JOIN · RIGHT JOIN · Self JOIN · JOIN Multiple Tables · JOIN with WHERE | 04-joins/01–07 |
| 26–31 | COUNT Function · SUM Function · AVG Function · MIN and MAX Functions · GROUP BY · HAVING Clause | 05-grouping/01–06 |
| 32–34 | Subquery in WHERE · Subquery in FROM · EXISTS Operator | 06-subqueries/01–03 |
| 35–36 | UNION · UNION ALL | 07-set-operators/01–02 |
| 37 | INSERT Single Row | 08/01-insert-row |
| 38 | INSERT Multiple Rows | 08/02-insert-many |
| 39 | INSERT with Specific Columns | **new** |
| 40 | UPDATE Single Column | 08/04-update-one |
| 41 | UPDATE Multiple Columns | 08/05-update-columns |
| 42 | UPDATE with WHERE Condition | 08/06-update-expression (repurposed) |
| 43 | UPDATE with JOIN | **new** (`UPDATE … FROM`) |
| 44 | DELETE with WHERE | 08/07-delete-where |
| 45 | DELETE with JOIN | 08/08-delete-using |
| 46 | INSERT INTO SELECT | 08/03-insert-select (moved to the end) |
| 47–50 | Basic CTE with WITH · Multiple CTEs · CTE for Complex Aggregation (repurposes 03-cte-filter) · Recursive CTE | 09-ctes/01–04 |
| 51–56 | ROW_NUMBER Window Function · RANK Window Function · CASE Expression · COALESCE Function · GROUP BY with ROLLUP · LAG Window Function | 10-advanced/01–06 |
| 57–62 | Understanding INTEGER Types · Understanding VARCHAR vs TEXT · Understanding DECIMAL for Money · Understanding DATE Types · PRIMARY KEY Constraint · FOREIGN KEY Constraint | 11-types-constraints/01–06 |

**Removed from the lab:** `02-sorting/04-nulls-last`, `07-set-operators/03-intersect` and `04-except`. They are
**moved** to `content/sql/_archive/`, which the loader ignores, not deleted, because the files are untracked.

### 5.3 Lessons with "Watch it happen" (22)
1, 2, 6, 9, 17, 18, 19, 20, 21, 22, 26, 30, 31, 32, 35, 36, 37, 42, 47, 51, 57 and 62.
Each script has 3–6 original steps using a small (3–5 row) slice of our dataset.

### 5.4 LeetLab (8 original problems, each on the `shop` dataset)
| Group | Problems |
|---|---|
| SELECT (5) | Out of Stock · Callable Customers · Top Three Products (existing) · **Young Customers Abroad** (new: age < 30 AND country ≠ 'USA') · **Short Product Names** (new: `LENGTH(name) <= 10`) |
| Basic Joins (2) | Customers Without Orders · Unsold Products (existing) |
| Easy Challenges (1) | **Busy Managers** (new: managers with at least 2 direct reports) |

The other 5 current problems move to `content/sql/_archive/problems/`.

## 6. `StepPlayer` behaviour

- **Stage.** A graph-paper grid background inside a bordered card, with a minimum height of about 300px. The visible
  tables are drawn left to right as compact monospace grids with a small orange label above each one. Notes are drawn to
  the right as blue (info) or orange cards.
- **Caption bar.** Below the stage, the step caption rendered as inline Markdown.
- **Control bar.** A round orange ▶/❚❚ button. When the last step finishes, it becomes ⟲ (replay). Next to it:
  - One progress segment per step, with the step label under it. The current segment fills orange, past segments stay full, and future segments are grey.
  - Clicking a label jumps to that step.
  - ‹ › buttons step back and forward, and are disabled at the ends.
- **Autoplay.** Each step lasts about 4.5 seconds, and the segment fill animates. Autoplay stops at the last step.
  Any manual step, jump or ‹/› pauses it. Autoplay never starts on its own; the user presses ▶.
- **Transitions.** Highlight and dim changes cross-fade in about 200ms. `prefers-reduced-motion` turns off the
  fill animation and the fades.
- **Accessibility.**
  - The caption is an `aria-live="polite"` region.
  - The step labels are buttons with `aria-current` on the current one.
  - ←/→ step while the player is focused, and Space plays or pauses.
- **State.** It's local to the component and resets when the lesson changes. It doesn't touch the database.

## 7. Error handling
- A broken step script is a content error: `check-content` fails, and in the app the lesson still
  loads with the player replaced by a small error note. A bad script never blanks the page.
- A comment that's missing from the schema shows an empty description cell, never an error.

## 8. Testing
- **content-loader:**
  - Unit tests that parse Context and Watch it happen.
  - Unit tests for each zod or reference error: an unknown table, an unknown column, a row out of range, a row whose length doesn't match its columns, and too few steps.
- **checkLab:** asserts 11 chapters, 62 lessons, 3 problem groups and 8 problems, and that exactly the 22 lessons in 5.3 have scripts.
- **engine-pglite:** `describe()` returns column descriptions, relationship descriptions and kinds, and `SERIAL`.
- **Component tests:**
  - `StepPlayer`: stepping, jumping, playing and pausing with fake timers, replay, disabled ends, and keyboard control.
  - `Sidebar`: badges, the ▸ marker and all chapters expanded.
  - `SchemaViewer`: badges and relationships.
  - `SolutionPanel`: copy.
- **e2e (Playwright):** update the existing specs for the new labels (LeetLab, Run Query), and add one spec that plays lesson 1's player to the end.
- **Visual check:** screenshot lessons 1 and 62 and the schema section at 1920px in both themes, and compare them by eye with the reference screenshots.

## 9. Open questions
- There is no screenshot of ChaiCode's **LeetLab problem page**. Until one is provided, it uses the lesson layout without
  Watch it happen, and with a difficulty badge and an Example table.
