# LeetLab workspace, text-size menu and challenge sidebar: design spec

Date: 2026-09-30 · Status: approved in chat · Builds on: `2026-09-30-sql-lab-chai-match-design.md`

## 1. Goal
Make our LeetLab tab look and behave like the reference LeetLab (the 9 Snagit screenshots from 2026-09-30, extracted
to the session scratchpad `snag/2026-09-30_15-*`).

This covers:
- a 4-pane resizable workspace
- a problem pane with Load Database, Hint and Example
- a challenge-style sidebar
- a per-area text-size menu, which applies on both tabs

All text stays original, and the branding stays ours.

Decided in chat:
- Each problem gets its **own small original tables**, like LeetCode.
- The text-size menu applies to **both tabs**.

## 2. LeetLab workspace (`tab === 'problems'`, desktop ≥ 900px)
- The main area fills the space under the lab header. It uses no page scroll; each pane scrolls on its own.
- There are two columns, 50/50 by default, with a vertical drag handle between them.
  - **Left column:** a vertical split, 60/40 by default.
    - Top: the **Problem pane** (§3).
    - Bottom: the **Schema pane** (§4).
  - **Right column:** a vertical split, 55/45 by default.
    - Top: the **SQL editor** card, which is the existing `QueryEditor` filling its pane, with Run Query.
    - Bottom: the **Output card**, with tabs **Query Results (n) | Database Schema**. Results use the existing `ResultsPanel` and `CheckBanner`.
- **Handles:**
  - A thin bar in the page background colour, with a small centred grip pill (32×3px, `bg-line-strong`) that turns orange on hover or drag.
  - Each handle can be focused and moved with the arrow keys.
- **Limits and saving:**
  - Every pane has a minimum of 15%.
  - Sizes are saved per device in localStorage, and are the same for all problems.
- **Below 900px:** the four panes stack in the order problem, schema, editor, output, with no handles. The main area scrolls.
- **Library:** `react-resizable-panels`, the latest release. Its accessible separators give keyboard support.

## 3. Problem pane
- **Header row:** it stays fixed while the body scrolls, with a bottom border.
  - The title, 1.125rem semibold.
  - The difficulty badge: EASY in green, MEDIUM in amber, HARD in red, as small uppercase pill badges.
  - A spacer, then the Load Database button and the Show Hint button.
  - **Load Database** is orange-outlined (`border-brand-line bg-brand-muted text-brand`). It reads "Loading…" while loading, then turns into **Database Loaded** (`border-ok-line bg-ok-bg text-ok`), which is disabled.
  - **Show Hint / Hide Hint** is an outlined button. It's hidden if the problem has no hint.
- **Body, scrolling:**
  1. The description: the problem intro, as Markdown.
  2. The **table structure** block: the `## Tables` section, rendered as a monospace box in `bg-subtle` with a border and horizontal scroll.
  3. The **Task** box: an orange left border on `bg-brand-muted`, with a **Task:** prefix. This is the same look as lessons.
  4. The **Example**: a `<details open>` element with the summary "▾ Example". Its body is the `## Example` section: Input tables, Output and Explanation in plain monospace.
  5. The **Hint** box, visible when Show Hint is on: a dashed border, with **Hint:** in bold followed by the hint text.
- **Loading behaviour:**
  - The problem database is **not** loaded automatically. The engine status is `idle` until Load Database is pressed.
  - Pressing Run Query while the database is idle loads it first, then runs.
  - Moving to another problem goes back to idle.

## 4. Schema pane (bottom-left) and the Database Schema tab
- **While idle:**
  - A header with "Database Schema" and the subtitle *Load the challenge database to view its schema*.
  - A centred body message: *Press "Load Database" to create this challenge's tables and see their structure.*
- **When ready:** the existing `SchemaViewer` card, with its accordions, columns and View Sample Data. The table descriptions come from `COMMENT ON TABLE` in each problem's setup.
- The Database Schema tab in the Output card shows the same content.

## 5. LeetLab header and sidebar
- **Header on LeetLab:**
  - The subtitle is `lab.problemsSubtitle`, which is "LeetCode-style practice" in lab.json. It falls back to the lab subtitle.
  - There is **no Reset DB button**. Load Database creates a fresh copy each time the problem is opened.
- **Sidebar on LeetLab:**
  - The header is **Challenges**, with the subtitle *Original SQL challenges, easy to hard*.
  - Each row has a 6px difficulty dot (Easy `bg-ok`, Medium `bg-warn`, Hard `bg-bad`, with an `aria-label` of the difficulty) and the title, which wraps instead of truncating. There's no number badge.
  - A solved problem shows ✓ instead of the dot.
  - The collapse rail stays as it is.

## 6. Text-size menu (both tabs)
The `Aᴬ` button opens a popover about 270px wide, in `bg-surface` with a border and the `shadow-float` shadow.
- **Header:** "Text size" on the left and a **Reset** link on the right, which sets everything to 100%.
- **Presets:** a segmented control with **S / M / L / XL**, which set every area to 90%, 100%, 110% or 125%. A preset shows as active when all the areas equal it.
- **Sliders:** one per area, with a label on the left, a range input in the middle (75%–150%, step 5) and the percentage on the right.

  | Area | Lessons label | LeetLab label |
  |---|---|---|
  | `list` | Lesson list | Lesson list |
  | `content` | Lesson | Problem |
  | `schema` | Schema browser | Schema browser |
  | `editor` | Code editor | Code editor |
  | `results` | Query results | Query results |

- **Footer:** "Saved on this device · default 100%" in faint text.
- **Button state:** while the popover is open, the Aᴬ button gets `border-brand-line bg-brand-muted text-brand`. Escape or clicking outside closes it.
- **Scaling:** CSS custom properties `--fs-list`, `--fs-content`, `--fs-schema` and `--fs-results` sit on `<html>`. Each area's inner content element gets `zoom: var(--fs-…)`.
  - The zoom goes on the sidebar's lesson list, not the sidebar itself, so the sidebar keeps its width.
  - The code editor uses Monaco's `fontSize = round(14 × editor)`, never zoom.
  - The old global `--font-scale` on html is removed.
- **Storage:** the prefs key gains `textSizes: { list, content, schema, editor, results }`.
  - Migration: an old `fontScale` value becomes all five areas at that value, clamped to 0.75–1.5.
  - Invalid values fall back to 1.

## 7. Problem content
- The 8 problems keep their ids, titles, groups and orders, and are rewritten to use their own tables.
- Each problem gets `## Setup` SQL: `CREATE TABLE` statements for 1–2 small original tables, `COMMENT ON TABLE`, and 5–8 rows of `INSERT`. It drops the `dataset:` front-matter.
- A new optional section, **`## Tables`**, holds a fenced text block with ASCII table structure, followed by 1–3 plain lines ("id is the primary key …"). The loader exposes it as `LessonItem.tables`.
- **`## Example`** becomes a fenced text block containing:
  - `Input:`, then each table as ASCII rows
  - `Output:`, then the ASCII result
  - `Explanation: …`
  
  The Output must equal the solution's result on those Input rows.
- Front-matter, check, hint and solution rules are unchanged. `check-content` runs each solution against its own setup.

## 8. Testing
- **useLabEngine:** in `autoLoad: false` mode it starts `idle`. `load()` moves it to `ready`. `run()` while idle loads first. A change of item resets it to idle.
- **prefs:** textSizes defaults, fontScale migration, clamping, presets and Reset.
- **TextSizeMenu:** it opens, presets set all sliders, a slider sets its own area, Reset works, Escape closes it, and the labels change per tab.
- **Sidebar:** LeetLab rows show difficulty dots with labels, wrapping titles and the Challenges header.
- **ProblemPane:** the load button goes through idle, loading and loaded; the hint toggles; the tables block and the example render.
- **Workspace:** 4 panes and 3 handles on desktop; stacked with no handles on mobile.
- **checkLab / shape test:** every problem has a setup, a Tables section and an Example. The group counts stay 5/2/1.
- **e2e:**
  - Open LeetLab, Load Database, and see Database Loaded.
  - Load the solution, run it, and see Correct!.
  - A handle moved with the keyboard changes the pane size.
  - The text-size XL preset sets the sliders to 125%.
- **Visual check:** compare against the 9 screenshots at 1920px, in light and dark themes.

## 9. Out of scope
- The "Do not Click" tab and the ChaiLabs branding.
- Sidebar auto-scroll.
- The top-navbar clipping at 375px.
