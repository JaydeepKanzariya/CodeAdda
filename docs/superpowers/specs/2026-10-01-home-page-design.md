# CodeAdda home page — design spec

Date: 2026-10-01
Status: approved in conversation; awaiting written review
Branch (user creates): `feature/home-page`

## 1. Goal

Give CodeAdda a marketing home page at `/`, laid out like the labs.chaicode.com home page (light and dark), with CodeAdda's own code and original copy. The page must be honest about what exists today: one SQL lab. It must load fast, work offline, and leave every existing lab route and test working.

Success looks like:
- Visiting `/` shows the home page instead of redirecting to `/sql`.
- The page has the same seven bands as the reference, in the same order and rhythm, using CodeAdda's tokens and both themes.
- Every number on the page is computed from the real content, never typed in.
- The hero demo shows a real query and its real result from the shop dataset, and a test proves it.
- No request leaves localhost (the e2e offline guard stays green). No new npm dependency.
- Nothing is committed by Claude; the user commits on their branch.

## 2. Decisions already made

| Topic | Decision |
|---|---|
| Approach | Lean build with the ChaiLabs look (Approach 1): all 7 bands, smallest footprint, standard Tailwind breakpoints |
| Lab grid | SQL live card + PostgreSQL, MongoDB, Redis as "Coming soon" cards; one row of 4 on desktop, 2×2 on tablets, 1 column on phones |
| Small orange text | Deeper orange (`#c2410c`) for small text in light mode so it passes WCAG AA; fills, bars, logo and dark mode keep the bright orange |
| Middle sections | Keep both: a 3-step "How it works" band and a 4-card "Why CodeAdda" section |
| Footer | Brand, Labs, Start here. No social, Privacy, Pricing, Docs or GitHub links (GitHub only if the user later says the repo is public) |
| XP / login | None. No Sign In button, no XP toast |
| Copy | Original throughout; nothing quoted or closely paraphrased from ChaiCode; no "Chai" wording |
| Lazy lab | The lab screen becomes lazy-loaded so `/` does not download Monaco. Done as the last, separately tested step |

## 3. Facts the design depends on

Measured from the reference and the repo during research on 2026-10-01.

- Real content today: 1 lab (`sql`), 11 chapters, 62 lessons (22 with `steps` animations), 3 problem groups, 8 problems, 70 items in total. The README's "63 / 10" is stale and is not used.
- Reference layout: container 1120px max-width with 24px side padding; sections 88px top/bottom; cards radius 16, 1px border, 22px padding, 14px gap; hero grid `minmax(0,1.05fr) minmax(0,1fr)` with 56px gap; fluid headline `clamp(2.5rem, 5.2vw, 4rem)`; section h2 `clamp(1.75rem, 3vw, 2.375rem)`; CTA title `clamp(1.4rem, 2.4vw, 1.9rem)`.
- Reference breakpoints: ≤1024 hero stacks and grids go to 2 columns; ≤680 everything is 1 column. Ours use Tailwind's `lg` (1024) and `sm` (640) instead; the 40px difference is invisible in practice.
- Reference motion: staggered fade/rise only (no typing). Copy rises at 0s (.6s), card at .12s (.7s), check rows at .70/1.02/1.34s (.36s), counter pops at 1.7s, toast pops at 1.9s with overshoot `cubic-bezier(.2,1.2,.4,1)`, caret blinks 1.1s `steps(2,start)`.
- CodeAdda tokens already cover every colour the page needs except one (see §5). Theme is a token swap keyed on `html[data-theme]`; there is no Tailwind `dark:` variant and the page must not introduce one.
- Fonts are bundled (`@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`). Icons in the app are inline SVG.
- `e2e/lab.spec.ts` aborts every non-localhost request and fails the test if any were attempted. Its `openFirstLesson()` helper starts at `/` and 10 tests depend on it.
- `index.html` shows a static boot loader with the text "Initializing CodeAdda SQLab database…" on every route before JS runs.
- Hero demo query, verified against `content/sql/datasets/shop.sql`: `users.country` has India ×3, USA ×3, Japan ×2 and every other country ×1. The query in §6.2 therefore returns exactly three rows in a deterministic order.

## 4. Architecture

### 4.1 New files — `apps/web/src/home/`

| File | Purpose |
|---|---|
| `HomePage.tsx` | `export function HomePage()`. Composes local section components: `Hero`, `LabsSection`, `HowItWorks`, `WhySection`, `CtaBanner`, `SiteFooter`, plus a shared `SectionHead`. Reads `getLab('sql')`; if it is undefined, stats and CTA buttons are hidden and the grid shows only coming-soon cards. Imports only `content/registry`, `lab/navigation`, `state/progress`, `lib/cx`, `components/Logo` and the home files. It must never import `QueryEditor`, `monacoSetup`, `useLabEngine`, `CheckBanner` or `Markdown`. |
| `HeroDemo.tsx` | The code window: header bar, code lines from the token array, blinking caret, "Result check" block with counter pill and three rows, and the overhanging "Correct!" pill. Wrapped in a `<figure>` with an sr-only `<figcaption>`. |
| `homeContent.ts` | Pure data and helpers, no React, testable in node. Exports `labStats(lab)`, `HERO_DEMO`, `demoSql(demo)`, `UPCOMING_COPY`, `STEPS`, `FEATURES`. |
| `icons.tsx` | About 12 inline SVG icons drawn fresh in the house style (viewBox 24, `stroke="currentColor"`, round caps and joins, `aria-hidden`, sized by `className`). Needed: arrow-right, database, clock, chip/cpu, circle-check, eye, bookmark, layers or document (PostgreSQL), braces (MongoDB), bolt or gauge (Redis), check (18px tick), plus the wordmark is text not an icon. |

`labStats(lab)` returns `{ chapters, lessons, problems, animated, total, firstLesson, firstProblem }`:
- `chapters = lab.lessons.length`
- `lessons = flatItems(lab,'lessons').length`
- `problems = flatItems(lab,'problems').length`
- `animated = flatItems(lab,'lessons').filter(i => i.steps).length`
- `total = lessons + problems`
- `firstLesson = itemPath(lab.id,'lessons', first lesson id)` or `undefined`
- `firstProblem = itemPath(lab.id,'problems', first problem id)` or `undefined`

`HERO_DEMO` shape: `{ file, crumb, lines: Array<Array<[tone, text]>>, columns: ['country','shoppers'], rows: [['India',3],['USA',3],['Japan',2]] }` where `tone ∈ 'comment' | 'keyword' | 'function' | 'number' | 'plain'`. `demoSql(d)` joins the tokens back into SQL so the render and the truth test share one source.

`UPCOMING_COPY: Record<UpcomingLab, { tagline: string; description: string; icon: IconName }>`. Because the key type is the `UPCOMING_LABS` tuple, adding a lab name without its copy fails typecheck.

### 4.2 Edited files

| File | Change |
|---|---|
| `apps/web/src/App.tsx` | Remove `Home()` and the `Navigate`/`labs` imports. Add `<Route path="/" element={<HomePage />} />`. Other routes unchanged. Final step: `LabRoute` becomes `React.lazy` behind `<Suspense fallback={<div className="h-[calc(100dvh_-_var(--navbar-height))]"><PageLoader label="Loading lab…" /></div>}>`. |
| `apps/web/src/content/registry.ts` | Add `export const UPCOMING_LABS = ['PostgreSQL','MongoDB','Redis'] as const; export type UpcomingLab = typeof UPCOMING_LABS[number];` |
| `apps/web/src/components/Navbar.tsx` | Replace the private `UPCOMING` constant with the import. Rendered output is identical, so `LabHeader.test.tsx` stays green. |
| `apps/web/src/styles/tokens.css` | Add `--color-accent-text`: `#c2410c` in light, `#fb923c` in dark. |
| `apps/web/src/styles/app.css` | `@theme inline`: `--color-brand-strong: var(--color-accent-text)`. `@theme`: `--animate-rise`, `--animate-pop`, `--animate-blink` with their keyframes. `@layer components`: `.home-hero-bg` (dots + `::after` glow) and `.home-cta-glow`, using `var(--color-*)` only. |
| `apps/web/index.html` | Boot text becomes "Loading CodeAdda…". The static boot navbar stays as is. |
| `apps/web/src/components/NotFound.tsx` | Add a secondary `<Link to="/">Back to home</Link>` beside the existing lab link. |
| `e2e/lab.spec.ts` | `openFirstLesson()` goes to `/sql`. Add a `test.describe('home')` block that reuses the offline guard. |

### 4.3 Routing and data flow

- `/` is a static route and outranks `/:labId`. `/sql` still redirects to the first lesson via `LabRoute`. The navbar logo (`to="/"`) now lands on the home page.
- A lab is **live** when the registry has it (its `content/<id>/` folder exists with a valid `lab.json`). Every `UPCOMING_LABS` name whose text does not prefix a registry lab's title renders as coming soon. This is the Navbar's existing filter, reused, so when `content/postgres/` is added the card becomes a link and "Coming soon" disappears from the navbar, the grid and the footer with no code change.
- Theme needs no new code: the pre-paint script in `index.html` already applies the saved theme, and every colour on the page is a token class.
- Progress: the SQL card reads `useProgress().completedCount('sql')` to choose "Open" vs "Continue".

### 4.4 Constraints

- No new npm dependencies. No `dark:` utilities. No raw hex outside `tokens.css`. No external URLs for fonts, icons or images.
- Tailwind v4 only generates classes it sees as literal strings; animation delays are inline `style={{ animationDelay }}`, never built class names.
- Content files are not touched. Claude does not commit.

## 5. Shared style

- Container: `mx-auto w-full max-w-280 px-4 sm:px-6` (1120px; 16px gutter on phones, 24px from 640px). The navbar keeps its own `max-w-360`.
- Section rhythm: `py-15 sm:py-22` (60px phones, 88px desktop). Anchor targets (`#labs`, `#how`) get `scroll-mt-(--navbar-height)`.
- Breakpoints: Tailwind defaults only. `sm` (640): grids to 2 columns, CTA banner becomes a row. `lg` (1024): hero 2 columns, labs and features 4 columns.
- Text colour rules: readable text uses `text-ink` or `text-muted`; orange **text** uses `text-brand-strong`; orange fills, bars, dots, caret and glow use `brand`; `text-faint` only for line numbers, separators and decoration; stats labels and card meta use `text-muted`.
- Landmarks: `<main id="main">` containing one `<section aria-labelledby>` per band, then `<footer>`. The hero `h1` is the only `h1`.
- Motion: `--animate-rise` (home-rise .6s ease-out both: opacity 0 + translateY(10px) → 1), `--animate-pop` (home-pop .42s cubic-bezier(.2,1.2,.4,1) both: opacity 0 + scale(.85) → 1), `--animate-blink` (1.1s steps(2,start) infinite). Used only through `motion-safe:`. With reduced motion, everything renders in its final state immediately.
- Navbar: unchanged in look. On `/` no lab link is active. The 375px clipping stays a separate follow-up.

## 6. Bands

### 6.1 Hero

- Section: `relative isolate overflow-hidden pt-12 pb-14 sm:pt-22 sm:pb-18`.
- Background (`aria-hidden`, `.home-hero-bg`): dots `radial-gradient(var(--color-border-hover) 1px, transparent 1px)` at 22px, opacity .7, masked with `radial-gradient(70% 60% at 65% 40%, #000, transparent 70%)`. `::after` glow `radial-gradient(closest-side, var(--color-accent-glow), transparent)`, opacity .6, positioned behind the card; no blur filter.
- Grid: `grid items-center gap-11 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14`.
- Copy column (`motion-safe:animate-rise`):
  - Pill: `inline-flex h-7 items-center gap-2 rounded-full border border-line bg-surface pl-2.5 pr-3 text-xs font-medium text-muted`; a 7px `bg-ok` dot with `shadow-[0_0_0_3px_var(--color-success-bg)]`. Text: **"SQL lab now open · {total} exercises"**.
  - H1: `text-[clamp(2.5rem,5.2vw,4rem)] font-bold leading-[1.02] tracking-[-0.035em]`. Line 1 **"Pull up a chair,"**, line 2 in a `text-brand-strong` span **"write real SQL."**
  - Lead: `max-w-130 text-xl leading-[1.6] text-muted`: **"CodeAdda is a hangout for learning to code by doing it. Type a query, run it on a real Postgres database inside your browser, and find out straight away whether your result is right."**
  - Actions: `flex flex-wrap gap-2.5`. Primary `Link` to `/sql`: `bg-inverse text-on-inverse h-11.5 px-5.5 rounded-md text-md font-medium` with a trailing arrow icon that nudges 2px on hover, opacity .88 on hover; label **"Start the SQL lab"**. Ghost anchor to `#labs`: `text-muted hover:bg-wash hover:text-ink`, label **"See the labs"**.
  - Stats: a `<dl class="flex gap-9">`; each item is `flex flex-col-reverse gap-0.5` with `<dt>` label (`text-sm text-muted`) and `<dd>` number (`text-2xl font-semibold tabular-nums tracking-tight`). Items: `{lessons}` **SQL lessons**, `{problems}` **practice problems**, `{animated}` **animated walkthroughs**.
- Code card (`HeroDemo`, `motion-safe:animate-rise` with 120ms delay): see §6.2.

### 6.2 Hero demo card

- Wrapper: `relative w-full max-w-140 lg:max-w-130 lg:ml-auto`. When stacked it sits left-aligned under the copy.
- Window: `overflow-hidden rounded-xl border border-line bg-surface shadow-float`.
- Header (40px): mono filename **`shoppers.sql`** left; crumb **"SQL Lab · Grouping Data"** right; both `text-xs text-muted`.
- Code: `<pre class="overflow-x-auto p-4.5 font-mono text-sm leading-[1.75]">`. Gutter: `inline-block w-6.5 select-none text-faint` spans, `aria-hidden`. Six lines, longest 32 characters (fits at 375px):

  ```sql
  -- Countries with 2+ shoppers
  SELECT country, COUNT(*) AS shoppers
  FROM users
  GROUP BY country
  HAVING COUNT(*) > 1
  ORDER BY shoppers DESC, country;
  ```

  Token colours: keyword `text-brand-strong`; function (`COUNT`) `text-warn`; number `text-note`; comment `italic text-muted`; plain `text-ink`. A 2px `bg-brand` caret after the last token, `motion-safe:animate-blink`.
- Check block (`border-t border-line bg-page px-4 pt-3 pb-3.5`): head row with uppercase label **"Result check"** (`text-xs font-semibold tracking-[.06em] text-muted`) and a counter pill **"3 / 3 rows"** (`rounded-full border border-ok-line bg-ok-bg px-2 text-xs font-semibold text-ok`, `motion-safe:animate-pop` at 1.7s). Three rows `mt-1 flex items-center gap-2.5 rounded-md border border-ok-line bg-ok-bg px-2.5 py-1.75 text-sm`: an 18px `bg-ok` circle with a white tick, the country, and a right-aligned mono count. Rows: **India 3 · USA 3 · Japan 2**, rising at .70s, 1.02s and 1.34s.
- "Correct!" pill: `absolute -right-3.5 -bottom-[18px] max-sm:right-2 max-sm:-bottom-4`. Outer layer `rounded-full bg-surface shadow-float` (solid backing, because `ok-bg` is 12% alpha in dark mode); inner `flex items-center gap-2 rounded-full border border-ok-line bg-ok-bg px-3.5 py-2 text-sm text-ok` with a circle-check icon, **"Correct!"** in bold and **"Result matches"**. `motion-safe:animate-pop` at 1.9s. No `role="status"`; does not reuse `CheckBanner`.
- Figcaption (sr-only): "Example: a GROUP BY query on the SQL lab's shop database, checked as correct."

### 6.3 Labs (`id="labs"`)

- Section head (`max-w-160 mb-11`): kicker **"The labs"** (`text-xs font-semibold uppercase tracking-[.1em] text-brand-strong`); h2 **"One lab is open. Three more are cooking."** (`text-[clamp(1.75rem,3vw,2.375rem)] font-semibold leading-[1.12] tracking-[-0.03em]`); lead **"Every lab pairs short lessons with a live database and an instant check. SQL is ready now; the others are being written."** (`mt-3 text-md leading-6 text-muted`).
- Grid: `<ul class="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">`.
- Live SQL card: a `<Link to="/sql">` with `group flex h-full flex-col gap-3 rounded-xl border border-line bg-surface p-5.5 transition`. Hover: `-translate-y-0.5 border-brand-line shadow-raised` (`motion-reduce:transform-none`).
  - Top row: 40px icon tile `rounded-md bg-brand-muted text-brand` with the database icon; badge **"Free"** using the `DifficultyBadge` ok pattern (`rounded-full border border-ok-line bg-ok-bg px-2 py-0.5 text-xs font-medium text-ok`).
  - `h3`: **SQL** (`text-xl font-semibold tracking-tight`) with tagline `{lab.subtitle}` below (`text-sm text-muted`), which today reads "Learn SQL, one query at a time".
  - Description (`text-base leading-[1.6] text-muted`): **"From your first SELECT to joins, CTEs and window functions, all on one realistic shop database."**
  - Footer: `mt-auto flex items-center justify-between border-t border-line pt-3 text-xs`. Left `text-muted`: **"{chapters} chapters · {total} exercises"**. Right `text-brand-strong font-medium` with an arrow that nudges 3px on hover: **"Open"**, or **"Continue"** when `completedCount('sql') > 0`.
- Coming-soon cards: a `<div>` with the same box but `bg-subtle`, no hover, not focusable. Icon tile `bg-surface text-faint`. Name `text-ink`; tagline and description `text-muted`. Badge **"Coming soon"** (`rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-medium text-muted`, with a leading 11px clock icon). Footer meta **"In the works"**, no link.
  - **PostgreSQL** — tagline "The Postgres extras" — "Planned: JSONB, arrays, indexes and reading a query plan."
  - **MongoDB** — tagline "Think in documents" — "Planned: filter, shape and aggregate JSON-style documents instead of rows."
  - **Redis** — tagline "Data at memory speed" — "Planned: keys, lists, sets and hashes, the pieces behind caches and leaderboards."

### 6.4 How it works (`id="how"`)

- Band: `border-y border-line bg-surface`.
- Head: kicker **"How it works"**, h2 **"Read, run, check, repeat"**, no lead.
- `<ol class="grid gap-x-10 gap-y-8 sm:grid-cols-3">`. Each `li`: `relative border-t border-line pt-4.5` with a `before:` 40×2px `bg-brand` bar at top -1px left 0. Inside: an `aria-hidden` mono number (`text-xs text-brand-strong`), title (`text-lg font-semibold tracking-tight`), body (`text-base leading-[1.65] text-muted`).
  1. **01 · Pick a lesson** — "Each lesson explains one idea in a few short paragraphs, then hands you a task that puts it to work."
  2. **02 · Run your query** — "Write SQL in the editor and press Run. A Postgres database living in your browser returns real rows."
  3. **03 · Get a verdict** — "CodeAdda compares your result with the expected one and, when they differ, shows you exactly which rows."

### 6.5 Why CodeAdda

- Head: kicker **"Why CodeAdda"**, h2 **"Built so practice turns into habit."**
- Grid: `grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4`. Card: `rounded-xl border border-line bg-surface p-5.5`, no hover. Icon tile 36px `rounded-md border border-line bg-page text-ink` with an 18px icon at stroke 1.8, `mb-4`. Title `text-md font-semibold tracking-tight mb-1.5`. Body `text-sm leading-[1.6] text-muted`.
  1. **No server, no setup** (chip) — "Postgres runs inside the page itself. No install, no account, and your queries never leave your machine."
  2. **Graded on results** (circle-check) — "Your rows are compared with the expected rows, not the text you typed, so any correct query passes."
  3. **Watch it happen** (eye) — "{animated} lessons animate what a clause does, step by step, before you try it yourself."
  4. **Your place, saved** (bookmark) — "Progress and drafts stay in this browser, so you can close the tab and pick up later."
- Truth note: card 1's "never leave your machine" and card 4's "stay in this browser" hold today because the engine is in-browser PGlite and progress is localStorage. Revisit both if analytics, a server engine (real MongoDB/Redis mode) or accounts are added.

### 6.6 CTA banner

- `relative isolate flex flex-col items-start gap-6 overflow-hidden rounded-xl border border-line bg-surface px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-11 sm:py-10`. `.home-cta-glow` (`aria-hidden`, absolute inset 0): `radial-gradient(50% 120% at 100% 50%, var(--color-accent-glow), transparent 70%)`, opacity .7.
- Title `text-[clamp(1.4rem,2.4vw,1.9rem)] font-semibold leading-[1.25] tracking-[-0.025em]`: **"The database is already running."** Lead `mt-1.5 text-md text-muted`: **"Open the first lesson and run a query now."**
- Buttons (`flex gap-2.5`): primary (same style as the hero primary) **"Start lesson one"** → `stats.firstLesson`; secondary `h-11.5 rounded-md border border-line bg-surface px-5.5 text-md font-medium text-ink hover:bg-subtle hover:border-line-strong` **"Try a problem"** → `stats.firstProblem`. Each button renders only if its path exists.

### 6.7 Footer

- `<footer class="border-t border-line bg-page pt-14 pb-10">`. Grid `grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]`.
- Brand column: `LogoMark` `size-6` + the two-tone wordmark (rendered here directly, since `Logo` hides its wordmark below `sm`), tagline **"An adda for code: learn it by running it."** with `<abbr title="Hindi for a place to hang out">adda</abbr>`, then **"© {new Date().getFullYear()} CodeAdda"** in `text-xs text-muted`.
- Column headings: `h2` `text-xs font-semibold uppercase tracking-[.08em] text-muted`.
- **Labs**: "SQL Lab" as a `Link` to `/sql`; each upcoming name as plain text followed by a small "soon" tag (`rounded-full border border-line px-1.5 text-[10px] uppercase text-faint`).
- **Start here**: "First lesson" → `firstLesson`, "Practice problems" → `firstProblem`, "How it works" → `#how`. Each renders only if its target exists.

## 7. Error handling

- `getLab('sql')` undefined (content failed to load): the hero pill shows "Labs opening soon", stats are omitted, hero primary button and CTA banner are omitted, the grid shows only coming-soon cards, and the footer Labs column lists all names as soon. The page never throws.
- Missing first lesson or problem: the corresponding button or footer link is omitted.
- Registry errors are already logged by `buildRegistry`; the home page adds nothing to the console.
- `AppErrorBoundary` still wraps the whole app, so a render error shows the existing friendly crash screen with Reload.

## 8. Testing

### 8.1 Unit (Vitest)

`apps/web/src/home/homeContent.test.ts` (node):
- `labStats` on a small fake `Lab`: chapters, lessons, problems, animated (counts only items with `steps`), total, `firstLesson` and `firstProblem` paths; the no-problems case yields `firstProblem` undefined.
- `UPCOMING_COPY` keys equal `UPCOMING_LABS` exactly.
- `demoSql(HERO_DEMO)` equals the six-line SQL in §6.2 (trimmed).

`apps/web/src/home/HomePage.test.tsx` (`// @vitest-environment jsdom`), rendering `<MemoryRouter><HomePage /></MemoryRouter>` without the Navbar:
- Exactly one `h1`, containing "Pull up a chair".
- "Start the SQL lab" link and the SQL card both have `href="/sql"`.
- Rendered stats equal `labStats(getLab('sql')!)` computed in the test, not literals.
- For each `UPCOMING_LABS` name inside the labs section, `closest('a')` is null; "Coming soon" appears exactly 3 times.
- The demo renders 3 rows and the text "Correct!"; `queryByRole('status')` is null.
- Every `<a>` `href` starts with `/` or `#`.
- Page text matches none of `/chai/i`, `/\bXP\b/`, `/sign in/i`.
- With progress seeded (`progressStore.markComplete('sql', <first lesson id>)` from `state/progress`), the SQL card reads "Continue"; without it, "Open".

`scripts/homeDemo.test.ts` (node; same pattern as `scripts/checkLab.test.ts`):
- Load the lab with `loadLabFromDir('content/sql')` (from `@codeadda/content-loader/node`), set up `PgliteEngine` with the shop dataset, run `demoSql(HERO_DEMO)`, assert columns are `['country','shoppers']` and rows equal `HERO_DEMO.rows` in order (counts compared after `Number()`). Dispose in `afterAll`.

Existing tests that must pass unchanged: `LabHeader.test.tsx`, `registry.test.ts`, `sqlLabShape.test.ts`, and everything else in the suite.

### 8.2 E2E (Playwright, inside `e2e/lab.spec.ts` so the offline guard applies)

1. `openFirstLesson()` navigates to `/sql` (fixes the 10 dependent tests).
2. `goto('/')`: the h1 is visible, 4 lab cards render, the "How it works" heading is visible, and no external request was attempted. Clicking "Start the SQL lab" lands on `/sql/lessons/select-all` with h1 "SELECT All Columns" and "Run Query" enabled.
3. No sideways scroll at 375×812 and 1024×768 (`scrollWidth <= clientWidth`), which guards the pill overhang and the glow.
4. Dark mode seeded through `addInitScript` (`localStorage['codeadda:prefs'] = '{"theme":"dark"}'`): `html[data-theme=dark]` is set and the h1 is visible.
5. `getByRole('link', { name: /MongoDB/ })` has count 0.
6. `emulateMedia({ reducedMotion: 'reduce' })`: the "Correct!" pill is visible immediately after load.
7. After the lazy step: loading `/` makes no request whose URL contains `monaco`.

### 8.3 Manual

- Widths 375, 768, 1024, 1280, 1440 in light and dark.
- Keyboard: tab order skips coming-soon cards; the focus ring is visible on the dark primary button in both themes.
- A contrast pass (axe or Lighthouse) in both themes.

### 8.4 Commands (the user runs them)

`npm run typecheck && npm test && npm run check-content && npm run e2e`

## 9. Out of scope

- A data catalog for future labs, a featured-span grid, "later" labs beyond the three upcoming ones.
- A regex SQL highlighter (the demo uses a hand-written token array).
- A route-aware boot script, translucent blurred navbar, lock icons, mobile edge fade, theme colour transitions, per-route `<title>`.
- Social links, GitHub link, progress bar on the SQL card.
- Fixing the navbar clipping at 375px (separate follow-up).
- Updating the README's stale counts (separate, trivial follow-up).

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Route swap without moving `openFirstLesson` breaks 10 e2e tests | Both changes land in the same step |
| Static demo rows drift from `shop.sql` | `scripts/homeDemo.test.ts` runs the query on PGlite and fails if rows change |
| Pill overhang clipped by hero `overflow-hidden` or causes sideways scroll below 640px | `max-sm:` offsets move it inward; e2e test at 375px |
| Translucent `ok-bg` in dark mode shows the card corner through the pill | Solid `bg-surface` backing layer |
| A `dark:` utility would follow the OS instead of `data-theme` | Review greps `apps/web/src/home` for `dark:`; none allowed |
| Tailwind purges built class names for delays | Delays are inline styles |
| PostgreSQL/MongoDB/Redis text now appears in navbar, cards and footer | Tests use role or `within()` queries, not bare `getByText` |
| Lazy `LabRoute` adds a brief "Loading lab…" state and could slow e2e | Done last, with its own build-size check and full e2e run; skipped if e2e becomes flaky |
| Copy drifts toward ChaiCode phrasing over time | Reviewers keep new strings away from the reference wording; page test rejects "Chai", "XP", "Sign in" |
| "Never leave your machine" becomes false later | Noted in §6.5; revisit when analytics or a server engine is added |
