# LeetLab Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a ChaiCode-style LeetLab tab (a 4-pane resizable workspace, a problem pane with Load Database, Hint and Example, and a challenge sidebar), add a per-area text-size menu on both tabs, and rewrite the 8 problems onto their own small tables.

**Architecture:**
- `useLabEngine` gains a deferred-load mode (`autoLoad: false`, `status: 'idle'`, `load()`).
- `LabView` renders the new `ProblemWorkspace` on the problems tab, and `LessonFlow` on lessons.
- The prefs store gains `textSizes`, applied as CSS `--fs-*` variables with `zoom` on each area's content element (Monaco uses `fontSize` instead).
- Problems use the existing `## Setup` support, plus a new `## Tables` section.

**Tech Stack:** React 19, Vite 7, TypeScript, Tailwind v4 tokens, `react-resizable-panels` (latest, v4.x), Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-30-leetlab-workspace-design.md`. Read it first; it is the authority.

## Global Constraints
- **No git commits, and no git index changes.** Never delete content files; use moves only.
- Our branding only. Never copy wording from `D:\Jaydeep\chai\chai_sql_content.md`, and never reproduce LeetCode problems.
- Token-backed Tailwind colours only in components. Monaco hex is the one exception.
- Both themes (`data-theme` light and dark) must work.
- Commands run from `D:\Jaydeep\codeadda`:

  | Purpose | Command |
  |---|---|
  | Type check | `npm run typecheck` |
  | Unit tests | `npx vitest run <path>` / `npm test` |
  | Content check | `npm run check-content` |
  | End-to-end tests | `npm run e2e` |

- Reference screenshots: `C:\Users\JAYDEE~1.KAN\AppData\Local\Temp\claude\D--Jaydeep-CodeAdda\2f517aed-93c0-44ad-93ae-41998c0ac09d\scratchpad\snag\2026-09-30_15-*\{*}.png`.
  - 15-00-37 and 15-00-56 show the default layout.
  - 15-01-14 shows the hint.
  - 15-01-43 and 15-01-59 show a loaded database.
  - 15-02-17 shows the text-size menu.
  - 15-02-41 and 15-02-58 show resized panes.
  - 15-07-41 shows the collapsed sidebar.

## Review Focus
- **Switching problems while a load is in flight:** a late `load()` result must not mark the new problem as ready. Pinned in Task 1.
- **Run Query pressed twice while idle:** it must load once, not twice. Pinned in Task 1.
- **Corrupt prefs** (a string, NaN, or out-of-range numbers): must fall back to 1 or clamp, never crash. Pinned in Task 2.
- **Zoomed areas at 150%:** the sidebar keeps its width, and the panes still scroll internally. Pinned in Task 8 (e2e/visual).
- **Resized panes when the window shrinks below 900px:** the layout switches to the stacked view with no hidden content. Pinned in Task 6.

---

### Task 1: Deferred engine loading

**Files:**
- Modify: `apps/web/src/lab/useLabEngine.ts`
- Modify: `apps/web/src/lab/useLabEngine.test.tsx` (read it first; reuse its fake-engine helpers)

**Interfaces:**
- `LabEngine.status: 'idle' | 'loading' | 'ready' | 'error'`
- `LabEngine.load(): Promise<void>`
- `useLabEngine(lab, item, { autoLoad?: boolean /* default true */, createEngine?, progress? })`

- [ ] **Step 1: Write the failing tests** in `useLabEngine.test.tsx`, using the file's existing render-hook pattern and fake engine:
  - `autoLoad: false` starts with `status === 'idle'` and never calls `setup`.
  - `load()` calls `setup(dataset)` once, then `describe`, and ends `ready` with a schema.
  - Calling `load()` twice concurrently calls `setup` exactly once.
  - `run(q)` while idle calls `setup` once, then runs `q`, and ends ready with a result.
  - Rerendering with a different item while a `load()` is pending ends `idle` for the new item. The pending load's result is dropped: the fake `setup` resolves later, and the status must stay idle.
  - With the default `autoLoad` (true), behaviour is unchanged. The existing tests must stay green.

- [ ] **Step 2: Run** `npx vitest run apps/web/src/lab/useLabEngine.test.tsx`. Expected: the new tests FAIL.

- [ ] **Step 3: Implement.**
  - Refactor the effect's load body into a `loadNow` function that closes over `dataset` and `generation`, and store the in-flight promise in a ref (`loading.current`), so concurrent `load()` calls share it.
  - In the item or dataset effect:
    - bump the generation;
    - clear `loading.current`;
    - reset the result, check and schema;
    - if `autoLoad`, set status `loading` and call `loadNow()`; otherwise set status `idle`.
  - `load = () => loading.current ?? (loading.current = loadNow())`. After it resolves, check that the generation is unchanged before calling `setState`.
  - `run(query)`: `if (state.status === 'idle') await load();`. Use a ref that mirrors status to avoid stale closures, and bail out if the generation changed.
  - Keep `reset`, `sample` and `retry` as they are. `retry` in idle mode calls `load()`.

- [ ] **Step 4: Run** `npx vitest run apps/web/src/lab` and `npm run typecheck`. Expected: PASS.

- [ ] **Step 5: No commit** (user rule).

---

### Task 2: Text-size prefs model

**Files:**
- Modify: `apps/web/src/state/prefs.ts`
- Modify: `apps/web/src/state/prefs.test.ts`
- Modify: `apps/web/src/components/QueryEditor.tsx` and its callers (`fontScale` becomes the editor size)

**Interfaces:**

```ts
export type TextArea = 'list' | 'content' | 'schema' | 'editor' | 'results';
export const TEXT_AREAS: readonly TextArea[] = ['list', 'content', 'schema', 'editor', 'results'];
export const TEXT_PRESETS = { S: 0.9, M: 1, L: 1.1, XL: 1.25 } as const;
export type TextPreset = keyof typeof TEXT_PRESETS;
export const TEXT_MIN = 0.75, TEXT_MAX = 1.5, TEXT_STEP = 0.05;
export interface Prefs { theme: Theme; textSizes: Record<TextArea, number>; sidebarCollapsed: boolean }
export function clampSize(n: unknown): number; // non-finite → 1; clamp to [0.75, 1.5]; round to 0.05
export function presetOf(sizes: Record<TextArea, number>): TextPreset | undefined; // all equal to a preset value
// prefsStore gains: setTextSize(area, n), setPreset(p), resetText()
```

`applyPrefs` sets `--fs-list`, `--fs-content`, `--fs-schema` and `--fs-results` on `document.documentElement` and removes `--font-scale`. The editor value is read directly by `QueryEditor`.

- [ ] **Step 1: Write the failing tests** in `prefs.test.ts`:
  - The defaults are all 1.
  - Migration: a stored `{ fontScale: 1.25 }` becomes all areas at 1.25, and a stored `fontScale: 9` is clamped to 1.5.
  - Corrupt input: `textSizes: { list: 'x', content: NaN, schema: 0.1 }` gives 1, 1 and 0.75, and the missing areas are 1.
  - `setPreset('XL')` sets all areas to 1.25, and `presetOf` returns 'XL'. `setTextSize('editor', 1.37)` gives 1.35. `resetText()` sets everything to 1.
  - `presetOf` returns undefined when the areas differ.
  - Everything persists to the key-value store and round-trips through `createPrefsStore`.

- [ ] **Step 2: Run** `npx vitest run apps/web/src/state/prefs.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - Remove `FONT_SCALES` and `fontScale`.
  - `QueryEditor` keeps its `fontScale` prop, but callers now pass `prefs.textSizes.editor`. `LessonFlow` is the current caller.
  - Update `html { font-size: calc(100% * var(--font-scale, 1)) }` in `app.css` to a plain `font-size: 100%`.
  - Add to `app.css`, in `@layer components`:

```css
.fs-list { zoom: var(--fs-list, 1); }
.fs-content { zoom: var(--fs-content, 1); }
.fs-schema { zoom: var(--fs-schema, 1); }
.fs-results { zoom: var(--fs-results, 1); }
```

  - `FontSizeSettings.tsx` stops compiling. Make a minimal temporary change so it uses `setPreset`; Task 3 replaces it.

- [ ] **Step 4: Run** `npx vitest run apps/web/src` and `npm run typecheck`. Expected: PASS.

- [ ] **Step 5: No commit** (user rule).

---

### Task 3: Text-size menu, and area zoom on the Lessons tab

**Files:**
- Create: `apps/web/src/components/TextSizeMenu.tsx` and `TextSizeMenu.test.tsx`
- Modify: `apps/web/src/components/FontSizeSettings.tsx` (becomes a re-export of `TextSizeMenu`, or delete its usage and point `LabHeader` at `TextSizeMenu`; **do not delete the file**, just leave it re-exporting)
- Modify: `apps/web/src/components/LabHeader.tsx` (pass `tab` to the menu)
- Modify: `apps/web/src/components/Sidebar.tsx` (the `fs-list` class on the `<nav>` list's inner wrapper, not on the aside)
- Modify: `apps/web/src/lab/LessonFlow.tsx` (`fs-content` on the header, player and your-turn wrapper; `fs-schema` on the SchemaViewer wrappers; `fs-results` on the results panel wrapper)

**Interfaces:** `TextSizeMenu({ tab }: { tab: Tab })`. The trigger is a button with `aria-label="Text size settings"` and `aria-expanded`. The popover is `role="dialog"` with `aria-label="Text size"`.

- [ ] **Step 1: Write the failing test** `TextSizeMenu.test.tsx`, using jsdom and a fresh store per test (use the store's `resetText()` in `beforeEach`):
  - Clicking the trigger shows the dialog with "Text size", Reset, 4 preset buttons (`aria-pressed`, M pressed by default), and 5 sliders (`role="slider"`, the native range input, named by their labels).
  - On `tab="problems"` the second label is "Problem"; on `tab="lessons"` it is "Lesson".
  - Clicking XL sets every slider value to 125 and shows "125%" five times.
  - Changing the "Code editor" slider to 130 shows 130% only on that row, and no preset button is pressed.
  - Reset puts every slider back to 100.
  - Escape closes the dialog. A mousedown outside closes it too.
  - The trigger has the `text-brand` class while the dialog is open.
  - The footer text "Saved on this device · default 100%" is present.

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement** `TextSizeMenu`. Layout:

```tsx
<div className="relative" ref={rootRef}>
  <button type="button" aria-label="Text size settings" aria-expanded={open} onClick={() => setOpen((o) => !o)}
    className={cx('grid size-9 place-items-center rounded-md border text-sm font-semibold shadow-soft',
      open ? 'border-brand-line bg-brand-muted text-brand' : 'border-line bg-surface text-ink hover:bg-hover')}>
    <span aria-hidden="true">A<sup className="text-[0.6em]">A</sup></span>
  </button>
  {open && (
    <div role="dialog" aria-label="Text size" className="absolute right-0 z-[2000] mt-2 w-[270px] rounded-xl border border-line bg-surface p-4 shadow-float">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Text size</p>
        <button type="button" onClick={prefsStore.resetText} className="text-xs text-faint hover:text-ink">Reset</button>
      </div>
      <div role="group" aria-label="Presets" className="mt-3 grid grid-cols-4 gap-1 rounded-lg border border-line bg-subtle p-1">
        {/* S M L XL buttons: aria-pressed, active = bg-surface text-ink shadow-soft border border-line, else text-faint */}
      </div>
      <div className="mt-4 space-y-3">
        {/* per area: <label className="flex items-center gap-3 text-sm"><span className="w-24 shrink-0 truncate">{label}</span>
            <input type="range" min={75} max={150} step={5} value={pct} onChange=… className="size-slider min-w-0 flex-1" aria-label={label} />
            <span className="w-10 text-right font-mono text-xs text-faint">{pct}%</span></label> */}
      </div>
      <p className="mt-4 border-t border-line pt-3 text-[0.6875rem] text-faint">Saved on this device · default 100%</p>
    </div>
  )}
</div>
```

  Slider styling goes in `app.css`, as `.size-slider` with `accent-color: var(--color-accent)` and height 4px. Close on Escape (keydown on document while open) and on a mousedown outside `rootRef`.

  In `LabHeader.tsx`, replace `<FontSizeSettings />` with `<TextSizeMenu tab={tab} />`.

- [ ] **Step 4: Wire the zoom classes on the Lessons tab.**
  - `Sidebar.tsx`: wrap the chapter list inside `<nav>` in `<div className="fs-list">`.
  - `LessonFlow.tsx`: add `className="fs-content"` wrappers around the header, the Watch it happen section and the Your turn section. Add `fs-schema` around both SchemaViewer usages. Add `fs-results` around `ResultsPanel` and `CheckBanner`.
  - Existing tests must stay green. Adjust only selectors that relied on DOM depth.

- [ ] **Step 5: Run** `npx vitest run apps/web/src` and `npm run typecheck`. Expected: PASS.

- [ ] **Step 6: No commit** (user rule).

---

### Task 4: Loader: `## Tables` section and `problemsSubtitle`

**Files:**
- Modify: `packages/core/src/types.ts` (`LessonItem.tables?: string`, `Lab.problemsSubtitle?: string`)
- Modify: `packages/content-loader/src/parseItem.ts` and `parseItem.test.ts`
- Modify: `packages/content-loader/src/schema.ts` and `buildLab.ts` (plus a `buildLab.test.ts` case)
- Modify: `content/sql/lab.json` (add `"problemsSubtitle": "LeetCode-style practice"`)

- [ ] **Step 1: Write the failing tests.**
  - `parseItem`: a problem with `## Tables` has the raw section text in `item.tables`, and one without it has `undefined`.
  - `buildLab`: `lab.problemsSubtitle` passes through from lab.json.

- [ ] **Step 2: Run** `npx vitest run packages/content-loader`. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - In `parseItem`, add `tables: sections['tables'] || undefined,` to the returned object.
  - In `schema.ts`, add `problemsSubtitle: z.string().optional()` to `labJson`.
  - In `buildLab`, pass `problemsSubtitle: meta.problemsSubtitle` through.
  - Add the field to lab.json.

- [ ] **Step 4: Run** `npx vitest run packages/content-loader`, `npm run typecheck` and `npm run check-content`. Expected: PASS.

- [ ] **Step 5: No commit** (user rule).

---

### Task 5: LeetLab sidebar and header

**Files:**
- Modify: `apps/web/src/components/Sidebar.tsx` and `Sidebar.test.tsx`
- Modify: `apps/web/src/components/LabHeader.tsx` and `LabHeader.test.tsx`
- Modify: `apps/web/src/lab/LabRoute.tsx` (don't pass `onReset` on the problems tab)

- [ ] **Step 1: Write the failing tests.**
  - Sidebar with `tab="problems"`:
    - The heading is "Challenges" and the subtitle is "Original SQL challenges, easy to hard".
    - Each problem link contains an element with `aria-label` "Easy", "Medium" or "Hard" and a matching dot class (`bg-ok`, `bg-warn` or `bg-bad`).
    - There is no `[data-badge]`, and the title element has no `truncate` class.
    - A completed problem shows `aria-label="completed"` in place of the dot.
  - LabHeader with `tab="problems"`: it shows the subtitle "LeetCode-style practice" (from `lab.problemsSubtitle`), and there's no Reset DB button when `onReset` is undefined.

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement.**
  - **Sidebar:**
    - The problems heading is `{ title: 'Challenges', subtitle: 'Original SQL challenges, easy to hard' }`.
    - For problems, the lesson row renders `<span aria-label={it.difficulty} className={cx('mt-1.5 size-1.5 shrink-0 self-start rounded-full', DOT[it.difficulty])} />`, with `const DOT = { Easy: 'bg-ok', Medium: 'bg-warn', Hard: 'bg-bad' }`. The title has `min-w-0 flex-1 leading-snug` and no `truncate`. The link uses `items-start`.
    - Remove the `DifficultyBadge` from sidebar rows.
  - **LabHeader:** `const subtitle = tab === 'problems' ? lab.problemsSubtitle ?? lab.subtitle : lab.subtitle;`.
  - **LabRoute:** `onReset={tab === 'lessons' ? () => void engine.reset() : undefined}`.

- [ ] **Step 4: Run** `npx vitest run apps/web/src` and `npm run typecheck`. Expected: PASS.

- [ ] **Step 5: No commit** (user rule).

---

### Task 6: ProblemWorkspace (4 resizable panes) and ProblemPane

**Files:**
- Install: `npm install react-resizable-panels -w @codeadda/web`. Read `node_modules/react-resizable-panels/README.md` and its type definitions for the v4 API: the group, panel and separator component names, the orientation prop, and layout persistence. Don't guess the API from memory.
- Create:
  - `apps/web/src/lab/ProblemWorkspace.tsx` and `ProblemWorkspace.test.tsx`
  - `apps/web/src/components/ProblemPane.tsx` and `ProblemPane.test.tsx`
  - `apps/web/src/components/ResizeHandle.tsx`
- Modify:
  - `apps/web/src/lab/LabRoute.tsx`: on the problems tab, call `useLabEngine(lab, item, { autoLoad: tab === 'lessons' })`, and render `<ProblemWorkspace key={item.id} … />` inside `<main className="min-w-0 flex-1 overflow-hidden lab:overflow-hidden max-lab:overflow-y-auto">`, without the lesson padding wrapper.
  - `apps/web/src/components/SchemaViewer.tsx`: add an optional `placeholder?: { subtitle: string; message: string }`. When `schema` is undefined and a placeholder is given, render the card header with that subtitle and the centred message, in place of "Loading schema…".

**Interfaces:**
- `ProblemWorkspace({ lab, item, engine }: { lab: Lab; item: LessonItem; engine: LabEngine })`
- `ProblemPane({ item, engine }: { item: LessonItem; engine: LabEngine })`
- `ResizeHandle({ orientation }: { orientation: 'horizontal' | 'vertical' })`

- [ ] **Step 1: Write the failing tests.**

`ProblemPane.test.tsx`: use a stub engine built the same way as in `LessonFlow.test.tsx`.
- The title, an "Easy" badge and the description render.
- The `## Tables` text renders inside a `<pre>`.
- The Example is inside a `<details>` element that is open, with the summary "Example".
- In status `idle` the button reads "Load Database", and clicking it calls `engine.load`.
- In status `loading` it reads "Loading…" and is disabled.
- In status `ready` it reads "Database Loaded" and is disabled.
- "Show Hint" reveals a box containing "Hint:" and the hint text. The button then reads "Hide Hint".
- With no hints, there is no hint button.

`ProblemWorkspace.test.tsx`: mock `QueryEditor` as in `LessonFlow.test.tsx`, and stub `matchMedia`.
- On desktop, it renders the 4 regions: the problem, a schema region named "Database Schema", the editor (the Run Query button), and the output tabs. There are 3 separators (`role="separator"`).
- On mobile (matchMedia false), there are no separators and all 4 regions are still present.
- Clicking Run Query calls `engine.run` with the draft or starter SQL.
- In the idle state, the schema pane shows the placeholder message containing "Load Database".

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement `ProblemPane`.**
  - **Header:** `<div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">`, containing:
    - `<h1 className="text-lg font-semibold">`
    - the difficulty pill, as a `<span>` with `rounded-full px-2 py-0.5 text-[0.625rem] font-bold tracking-wider uppercase` and tone classes (Easy `bg-ok-bg text-ok`, Medium `bg-warn-bg text-warn`, Hard `bg-bad-bg text-bad`)
    - `ml-auto`, then the Load button, then the hint button. The button styles are in spec §3.
  - **Body:** `<div className="fs-content min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">`, containing:
    - the description `Markdown`
    - the tables block, as `<pre className="overflow-x-auto rounded-md border border-line bg-subtle p-4 font-mono text-xs leading-relaxed">`. Strip the fence and use the first code block of the section, or the raw text if there's no fence, and render any text after the code block as Markdown below the `<pre>`.
    - the Task box, with the same markup as `LessonFlow`
    - `<details open className="rounded-md border border-line bg-subtle"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Example</summary><div className="px-4 pb-4"><Markdown>{item.example}</Markdown></div></details>`
    - the hint box, when shown: `rounded-md border border-dashed border-line-strong px-4 py-3 text-sm`, with `<strong>Hint:</strong>` followed by the hints
  - The component root is `flex h-full flex-col overflow-hidden rounded-none bg-surface`.

- [ ] **Step 4: Implement `ProblemWorkspace`.**
  - Draft and query state work like `LessonFlow`: `progressStore` drafts plus `useDraftSaver`.
  - Output tab state is `'results' | 'schema'`.
  - Detect the viewport with the same `(min-width: 56.25rem)` media query the Sidebar uses. Extract Sidebar's `useIsDesktop` into `apps/web/src/lib/useIsDesktop.ts` and import it in both places.
  - **Desktop:**
    - A horizontal group with a saved layout id `leetlab-cols` and default sizes 50/50.
    - Left: a vertical group, `leetlab-left`, at 60/40, holding `ProblemPane` and `SchemaPane`.
    - Right: a vertical group, `leetlab-right`, at 55/45, holding the editor card and the output card.
    - Every panel has a 15% minimum.
    - The panels sit in `bg-page` with a 12px gap created by the handles. The cards inside are `h-full overflow-hidden rounded-xl border border-line bg-surface`, except the left column, which is flush like the reference (`bg-surface`, no radius).
    - `SchemaPane` is `section aria-label="Database Schema"` with `fs-schema h-full overflow-y-auto`, containing `SchemaViewer` with its placeholder when the engine is idle.
    - The editor card is the existing `QueryEditor`, made to fill its pane. Give `QueryEditor` an optional `height?: string` prop, defaulting to `'220px'`, and pass `'100%'` here, wrapped in `h-full`. Monaco's `automaticLayout` handles resizing.
    - The output card has the tabs from `LessonFlow`, and `fs-results` on the results body.
  - **Mobile:** the same four sections stacked (`space-y-4 p-4`), with fixed heights: the editor at 320px and the others in natural flow.
  - **`ResizeHandle`:** the library's separator element, with a class along the lines of `group relative flex items-center justify-center bg-page data-[orientation=horizontal]:w-3 data-[orientation=vertical]:h-3`. Adapt the class to the attributes v4 actually exposes. Inside it goes a grip span (`h-8 w-[3px]` for column handles, `h-[3px] w-8` for row handles, `rounded-full bg-line-strong group-hover:bg-brand group-data-[dragging]:bg-brand`, or the v4 equivalent).
  - **LabRoute:** switch between `ProblemWorkspace` and `LessonFlow` by tab, as described under Files.

- [ ] **Step 5: Run** `npx vitest run apps/web/src` and `npm run typecheck`. Expected: PASS.

- [ ] **Step 6: Manual check.**
  - Run `npm run dev` in the background and open `/sql/problems/out-of-stock` at 1920×1000.
  - Drag each handle, and check that the panes resize and the sizes survive a reload.
  - Narrow the window to 800px and check that the panes stack.
  - Stop the dev server.

- [ ] **Step 7: No commit** (user rule).

---

### Task 7: Rewrite the 8 problems onto their own tables

**Files:** the 8 files under `content/sql/problems/` (keep their paths, ids, titles, chapters, orders, difficulties, `check`, and task intent).

- [ ] **Step 1: Rewrite each problem to this shape.** Out of Stock is shown as the worked example; the wording is ours:

````markdown
---
id: out-of-stock
title: Out of Stock
chapter: SELECT
order: 1
difficulty: Easy
check: rows-unordered
---

The warehouse team is planning this week's restock and needs every product that has run out completely.

## Tables
```text
Table: Items

+-------------+---------+
| Column Name | Type    |
+-------------+---------+
| item_id     | int     |
| item_name   | varchar |
| on_hand     | int     |
+-------------+---------+
```
item_id is the primary key of this table.
on_hand is the number of units currently in the warehouse.

## Task
Write a query that returns the `item_name` of every item whose `on_hand` is 0. Return the rows in any order.

## Example
```text
Input:
Items table:
+---------+--------------+---------+
| item_id | item_name    | on_hand |
+---------+--------------+---------+
| 1       | Desk Lamp    | 12      |
| 2       | Smart Watch  | 0       |
| 3       | Yoga Mat     | 7       |
| 4       | French Press | 0       |
| 5       | USB-C Hub    | 3       |
+---------+--------------+---------+

Output:
+--------------+
| item_name    |
+--------------+
| Smart Watch  |
| French Press |
+--------------+

Explanation: Only Smart Watch and French Press have no units left.
```

## Hint
- Filter the rows with `WHERE on_hand = 0`.

## Setup
```sql
CREATE TABLE items (item_id INTEGER PRIMARY KEY, item_name VARCHAR(50) NOT NULL, on_hand INTEGER NOT NULL);
COMMENT ON TABLE items IS 'Challenge table: items';
INSERT INTO items VALUES (1, 'Desk Lamp', 12), (2, 'Smart Watch', 0), (3, 'Yoga Mat', 7), (4, 'French Press', 0), (5, 'USB-C Hub', 3);
```

## Solution
```sql
SELECT item_name FROM items WHERE on_hand = 0;
```
````

Rules for all 8:
- Tables are original, small (1–2 tables, 5–8 rows) and designed so the answer is interesting (2–4 output rows).
- The Example Input is the **same rows as the Setup**, and the Output is exactly the solution's result on them. Verify it by running the solution (see Step 3).
- Use `COMMENT ON TABLE x IS 'Challenge table: x'`.
- Keep each problem's current idea:

  | Problem | Idea |
  |---|---|
  | Out of Stock | products with zero stock |
  | Callable Customers | customers who have a phone number |
  | Top Three | the 3 most expensive, ordered, `check: rows-ordered` |
  | Young Customers Abroad | age < 30, not the USA, excluding NULL ages |
  | Short Product Names | names of at most 10 characters |
  | Customers Without Orders | an anti-join |
  | Unsold Products | products never ordered |
  | Busy Managers | employees with at least 2 direct reports; self-join, Medium |

  Read each current file first to keep its check mode.

- [ ] **Step 2: Remove the `dataset: shop` front-matter line** from each problem, since `## Setup` replaces it.

- [ ] **Step 3: Verify.**
  - Run `npm run check-content`. Expected: `✓ sql: 70 item(s) checked, 0 problem(s)`.
  - For each problem, run its solution on its setup and compare the result with the Example Output. Use a small `npx tsx -e` script with `PgliteEngine` (see `scripts/check-content.ts` for the setup) and paste the outputs into the report.

- [ ] **Step 4: No commit** (user rule).

---

### Task 8: Shape test, e2e, visual check

**Files:**
- Modify: `scripts/sqlLabShape.test.ts` (add the problem assertions)
- Modify: `e2e/lab.spec.ts` (add the LeetLab tests)

- [ ] **Step 1: Shape test.** Add:

```ts
  it('gives every problem its own setup, a Tables section and an Example', () => {
    const problems = lab.problems.flatMap((c) => c.items);
    expect(problems.filter((p) => !p.setup || !p.tables || !p.example || p.dataset).map((p) => p.id)).toEqual([]);
  });
```

- [ ] **Step 2: e2e tests.** Add these to `e2e/lab.spec.ts`, and adjust selectors to the real accessible names:

```ts
test('LeetLab: load the database, solve, and see Correct!', async ({ page }) => {
  await page.goto('/sql/problems/out-of-stock');
  await expect(page.getByRole('heading', { level: 1, name: 'Out of Stock' })).toBeVisible();
  await expect(page.getByText(/Load (the )?challenge database/i).first()).toBeVisible();
  await page.getByRole('button', { name: 'Load Database' }).click();
  await expect(page.getByRole('button', { name: 'Database Loaded' })).toBeDisabled();
  await typeQuery(page, 'SELECT item_name FROM items WHERE on_hand = 0;');
  await page.getByRole('button', { name: 'Run Query' }).click();
  await expect(page.getByText('Correct!')).toBeVisible();
});

test('LeetLab: panes resize with the keyboard', async ({ page }) => {
  await page.goto('/sql/problems/out-of-stock');
  const sep = page.getByRole('separator').first();
  const before = await sep.getAttribute('aria-valuenow');
  await sep.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(sep).not.toHaveAttribute('aria-valuenow', before ?? '');
});

test('text size: XL preset sets every slider to 125%', async ({ page }) => {
  await page.goto('/sql/lessons/select-all');
  await page.getByRole('button', { name: 'Text size settings' }).click();
  await page.getByRole('button', { name: 'XL' }).click();
  await expect(page.getByRole('dialog', { name: 'Text size' }).getByText('125%')).toHaveCount(5);
});
```

  Also update any existing test that clicks the "LeetLab" tab or expects the old problem layout. The problem pane has no Solution panel, per spec §3.

- [ ] **Step 3: Run** `npm run typecheck`, `npm test`, `npm run check-content`, and `npm run e2e` twice. Expected: all green.

- [ ] **Step 4: Visual check.**
  - With the dev server in the background, screenshot `/sql/problems/out-of-stock` at 1920×1000 in four states: default, database loaded, hint open, and text-size menu open. Take them in light and dark themes, and save them to the workspace folder.
  - Compare them side by side with the reference PNGs (Global Constraints), and fix clear visual differences using token classes only.
  - Also screenshot a lesson at 150% text size, and confirm the sidebar width is unchanged and the panes scroll.
  - Stop the dev server, and confirm nothing is left listening on its port.

- [ ] **Step 5: Build.** Run `npm run build`. Expected: success.

- [ ] **Step 6: No commit.** Write `.superpowers/sdd/2026-09-30-leetlab-workspace/final-report.md`, with test counts, the screenshots, visual differences fixed and left, and the files changed.
