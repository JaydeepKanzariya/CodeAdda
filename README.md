# CodeAdda

Interactive labs for learning databases by writing real queries. Two labs are live: the
**SQL lab** (62 lessons across 11 chapters, plus 8 practice problems) and the
**PostgreSQL lab** (46 lessons from beginner to advanced across 18 chapters, plus 12 practice
problems), both running real PostgreSQL in your browser via PGlite. MongoDB and Redis labs are
coming next.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

`/` is the home page (the labs, how it works, and a live example); `/sql` opens the SQL lab; `/postgres` opens the PostgreSQL lab.
Everything runs in the browser, with no server and no account.

## Checks

```bash
npm test             # unit and component tests (Vitest)
npm run typecheck    # TypeScript
npm run check-content  # runs every lesson/problem solution against its dataset
npm run e2e          # browser tests (Playwright; run `npx playwright install chromium` once)
```

## Add your own lesson

1. Each lab lives in its own folder (`content/sql/`, `content/postgres/`) with the same format.
   Create a Markdown file under `content/<lab>/lessons/<NN-chapter>/<NN-slug>.md`
   (or `content/<lab>/problems/...` for a problem).
2. Start it with front-matter:

   ```yaml
   ---
   id: my-lesson            # unique, a-z 0-9 -
   title: My Lesson
   chapter: Filtering Data  # lessons: listed in "chapters" of content/<lab>/lab.json
                            # problems: listed in "problemGroups" of content/<lab>/lab.json
   order: 11                # position inside the chapter
   dataset: shop            # file in content/<lab>/datasets/ (without .sql)
   check: rows-unordered    # rows-unordered | rows-ordered | state | custom
   # checkQuery: SELECT ...   required for state and custom
   # difficulty: Easy         required for problems
   ---
   ```

   A lab's `lab.json` may list `levels` (`{ "title", "from" }`), which group its chapters under headings in the sidebar.

   Problems work the same way, but their `chapter` must be one of the `problemGroups` in
   `content/<lab>/lab.json` (not `chapters`), and they must set `difficulty` (Easy | Medium | Hard).

3. Then write: an explanation, `## Task`, `## Hint` (bullets), optional `## Example`,
   and `## Solution` with a ```sql code block.
4. Save — the dev server shows it immediately. Run `npm run check-content` to verify the
   solution works.

Check modes: `rows-unordered` compares result rows in any order; `rows-ordered` also checks
order; `state` runs `checkQuery` after your query and after the solution and compares those;
`custom` passes when `checkQuery` returns a true first value.

## Layout

- `apps/web` — React + Vite + Tailwind UI
- `packages/core` — shared types, result comparison, grader
- `packages/content-loader` — Markdown lessons → lab data
- `packages/engine-pglite` — PostgreSQL (PGlite) engine
- `content/` — labs, lessons, problems and datasets
- `docs/superpowers/` — design spec and implementation plans
