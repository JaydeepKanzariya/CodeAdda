# Lazy Lab Content — Design and Implementation Plan

> **For agentic workers:** implement task by task, in order. Steps use checkbox (`- [ ]`) syntax. Each code task is test-first (write the test, see it fail for the expected reason, implement, see it pass).

**Goal:** The home page stops downloading every lesson of every lab. It loads a tiny per-lab summary up front; a lab's full content loads only when that lab is opened, as one chunk per lab.

**Why:** Today `apps/web/src/content/registry.ts` imports every lesson, problem and dataset of every lab eagerly (`import.meta.glob(..., { eager: true })`), so the home page's entry JavaScript is **742 kB** (213 kB gzip) and grows with every lab. The home page, navbar and 404 page only need a few facts per lab; only the lab screen needs full content.

**Branch:** `perf/lazy-lab-content` (from `main` at `12df3bb`, after PR #4). The user commits; implementers never commit.

## Design

### What each consumer needs today
| Consumer | Uses | Needs |
|---|---|---|
| `components/Navbar.tsx` | `labs`, `upcomingLabs()` | id, title |
| `components/NotFound.tsx` | `labs[0]` | id, title |
| `home/HomePage.tsx` + `home/homeContent.ts` | `labs`, `labStats(lab)`, `heroPill(labs)`, `upcomingLabs()` | id, title, subtitle, chapter/lesson/problem/animated counts, first lesson id, first problem id |
| `lab/LabRoute.tsx` | `getLab(id)` | the full `Lab` — for **one** lab |

### Approach: a Vite plugin with three virtual modules
A new plugin `apps/web/plugins/labContent.ts` reads `content/` at dev/build time using the existing Node loader (`@codeadda/content-loader/node`), loaded through **`tsx`** (`import { tsImport } from 'tsx/esm/api'`) because Vite's config loader cannot import our TypeScript workspace packages directly. *(Verified on 2026-10-02: a direct import fails with "Unknown file extension .ts"; `tsImport('@codeadda/content-loader/node', import.meta.url)` inside a Vite config works and loads both labs.)*

It serves:
1. **`virtual:lab-summaries`** → `export const labSummaries = [...]` — one small `LabSummary` per valid lab (a few hundred bytes each). Imported eagerly by the registry.
2. **`virtual:lab-content`** → `export const labLoaders = { "<labId>": () => import("virtual:lab-content/<dir>"), … }` — one loader function per lab.
3. **`virtual:lab-content/<dir>`** → `export default { labJson, files }` — that lab's full `LabSource` (the same shape `buildLab` takes). Because it is reached only through a dynamic `import()`, Vite puts each lab in **its own chunk**, fetched once when the lab is opened.

In dev, the plugin watches `content/` and, on any add/change/unlink there, invalidates all three kinds of virtual module and sends a full reload (this replaces the existing `watchContent()` plugin in `apps/web/vite.config.ts`).

The registry keeps its public role but changes shape:
- `labSummaries: LabSummary[]` (sorted `sql → postgres → mongodb → redis → others`), replacing `labs`.
- `upcomingLabs(live = labSummaries)` — unchanged behaviour (it only reads `title`).
- `loadLab(id): Promise<Lab | undefined>` — replaces `getLab(id)`. Cached per id; a failed load is removed from the cache so a retry can succeed.

`LabRoute` checks `labSummaries` first (unknown id → `NotFound` immediately, nothing loaded), then reads the lab with React 19's `use(loadLab(id))`. The existing `<Suspense fallback={<PageLoader label="Loading lab…" />}>` in `App.tsx` covers the wait. A load error propagates to the existing `AppErrorBoundary` (friendly message + Reload).

### Non-goals
- No change to lesson content, the lesson format, the grader, `check-content` or any Node script (they keep using `loadLabFromDir`).
- No change to how a lab's engine/Monaco loads (already lazy).
- No service worker / prefetching.

### Success criteria
- Entry JavaScript for `/` drops from 742 kB to **under 250 kB** (minified), and stays flat when labs are added.
- Visiting `/` requests no lab content; opening `/postgres` requests only the PostgreSQL content chunk.
- Every existing unit, content and e2e test passes (some updated on purpose, listed per task).
- Dev: adding a new lesson file or lab folder still shows up without restarting the server.

## Global Constraints
- **No git commits, adds, stashes, pushes or branch changes.**
- No new npm dependencies (`tsx` is already a root devDependency; Vite 7.3, React 19.3).
- No `dark:` utilities, no raw hex outside `tokens.css`, no external URLs (e2e aborts non-localhost requests).
- Don't touch `content/**`, `packages/engine-pglite/**`, `scripts/check-content.ts`, `scripts/checkLab.ts`.
- Verification: `npm run typecheck`, `npx vitest run <files>`, `npm test`, `npm run check-content`, `npm run e2e`, `npm run build -w @codeadda/web`.

## Review Focus
1. **Direct deep link** (`/postgres/lessons/jsonb-…` typed in the address bar) must load the lab and the right lesson, with the "Loading lab…" fallback, not a blank page. Pinned in Task 5 (e2e).
2. **Unknown lab id** (`/nope`) must show the 404 page without fetching any content. Pinned in Task 4 (unit) and Task 5 (e2e).
3. **Switching labs** (SQL → PostgreSQL via the navbar) must load the new lab's chunk and not reuse the old lab's lessons. Pinned in Task 5 (e2e).
4. **A broken `lab.json`** must not break the home page: the plugin skips that lab with a warning (it disappears from summaries), exactly as `buildRegistry` skips it today. Pinned in Task 2 (unit).
5. **Dev edit loop:** adding a lesson file under `content/` must show up after the automatic reload. Manual check in Task 6.

---

### Task 1: `LabSummary` type and `summarizeLab()`

**Files:** Modify `packages/core/src/types.ts`; Create `packages/content-loader/src/summary.ts`; Modify `packages/content-loader/src/index.ts`; Test `packages/content-loader/src/summary.test.ts`.

**Produces:** `interface LabSummary { id; dir; title; subtitle; language; chapters; lessons; problems; animated; firstLessonId?; firstProblemId? }` and `summarizeLab(lab: Lab, dir: string): LabSummary`.

- [ ] **Step 1: failing test** — `packages/content-loader/src/summary.test.ts`:
```ts
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadLabFromDir } from './node';
import { summarizeLab } from './summary';

describe('summarizeLab', () => {
  it('counts what the home page shows, for both real labs', () => {
    for (const dir of ['sql', 'postgres']) {
      const lab = loadLabFromDir(resolve(import.meta.dirname, '../../../content', dir));
      const lessons = lab.lessons.flatMap((c) => c.items);
      const problems = lab.problems.flatMap((c) => c.items);
      expect(summarizeLab(lab, dir)).toEqual({
        id: lab.id, dir, title: lab.title, subtitle: lab.subtitle, language: lab.language,
        chapters: lab.lessons.length, lessons: lessons.length, problems: problems.length,
        animated: lessons.filter((l) => l.steps).length,
        firstLessonId: lessons[0]?.id, firstProblemId: problems[0]?.id,
      });
    }
  });

  it('leaves the first ids undefined for an empty lab', () => {
    const empty = { id: 'x', title: 'X Lab', subtitle: '', language: 'sql', lessons: [], problems: [], datasets: {}, errors: [] } as never;
    expect(summarizeLab(empty, 'x')).toMatchObject({ lessons: 0, problems: 0, firstLessonId: undefined, firstProblemId: undefined });
  });
});
```
- [ ] **Step 2:** `npx vitest run packages/content-loader/src/summary.test.ts` → FAIL (module not found).
- [ ] **Step 3: type** — in `packages/core/src/types.ts`, after `Lab`:
```ts
/** The few facts the home page, navbar and 404 page need about a lab, without its lessons. */
export interface LabSummary {
  id: string;
  /** Folder name under content/ (normally equal to id). */
  dir: string;
  title: string;
  subtitle: string;
  language: LabLanguage;
  chapters: number;
  lessons: number;
  problems: number;
  /** Lessons with a "Watch it happen" script. */
  animated: number;
  firstLessonId?: string;
  firstProblemId?: string;
}
```
- [ ] **Step 4: function** — `packages/content-loader/src/summary.ts`:
```ts
import type { Lab, LabSummary } from '@codeadda/core';

export function summarizeLab(lab: Lab, dir: string): LabSummary {
  const lessons = lab.lessons.flatMap((c) => c.items);
  const problems = lab.problems.flatMap((c) => c.items);
  return {
    id: lab.id, dir, title: lab.title, subtitle: lab.subtitle, language: lab.language,
    chapters: lab.lessons.length, lessons: lessons.length, problems: problems.length,
    animated: lessons.filter((l) => l.steps).length,
    firstLessonId: lessons[0]?.id, firstProblemId: problems[0]?.id,
  };
}
```
and add `export { summarizeLab } from './summary';` to `packages/content-loader/src/index.ts`.
- [ ] **Step 5:** run the test → PASS; `npm run typecheck` clean.

---

### Task 2: the `labContent()` Vite plugin

**Files:** Create `apps/web/plugins/labContent.ts`; Modify `apps/web/vite.config.ts` (replace `watchContent()` with `labContent()`); Modify root `vitest.config.ts` (add `plugins: [labContent()]` so tests can import the registry); Modify `apps/web/src/vite-env.d.ts` (module declarations); Modify root `tsconfig.json` `include` (add `"apps/*/plugins"`); Test `apps/web/plugins/labContent.test.ts`.

**Produces:** virtual modules `virtual:lab-summaries`, `virtual:lab-content`, `virtual:lab-content/<dir>`; pure helper `export function generateModules(contentDir): Promise<{ summaries: LabSummary[]; sources: Record<string, LabSource>; ids: Record<string,string> }>` used by the plugin and the test.

- [ ] **Step 1: failing test** — `apps/web/plugins/labContent.test.ts` (node environment):
```ts
import { cpSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateModules } from './labContent';

const contentDir = resolve(import.meta.dirname, '../../../content');

describe('labContent plugin data', () => {
  it('summarises every valid lab and keeps each lab source keyed by folder', async () => {
    const { summaries, sources } = await generateModules(contentDir);
    expect(summaries.map((s) => s.id).sort()).toEqual(['postgres', 'sql']);
    expect(Object.keys(sources).sort()).toEqual(['postgres', 'sql']);
    expect(Object.keys(sources.sql!.files).some((p) => p.startsWith('lessons/'))).toBe(true);
    expect(JSON.parse(sources.postgres!.labJson).id).toBe('postgres');
  });

  it('skips a lab whose lab.json is invalid instead of failing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'labs-'));
    cpSync(join(contentDir, 'sql'), join(dir, 'sql'), { recursive: true });
    cpSync(join(contentDir, 'sql'), join(dir, 'broken'), { recursive: true });
    writeFileSync(join(dir, 'broken', 'lab.json'), '{ not json');
    const { summaries } = await generateModules(dir);
    expect(summaries.map((s) => s.id)).toEqual(['sql']);
  });
});
```
- [ ] **Step 2:** `npx vitest run apps/web/plugins/labContent.test.ts` → FAIL (module not found).
- [ ] **Step 3: plugin** — `apps/web/plugins/labContent.ts`:
```ts
import { basename, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, ViteDevServer } from 'vite';
import { tsImport } from 'tsx/esm/api';
import type { LabSummary } from '@codeadda/core';
import type { LabSource } from '@codeadda/content-loader';

// Vite's config loader can't import our TypeScript workspace packages, so load them through tsx.
type NodeLoader = typeof import('@codeadda/content-loader/node');
type Loader = typeof import('@codeadda/content-loader');
const load = async () => ({
  node: (await tsImport('@codeadda/content-loader/node', import.meta.url)) as NodeLoader,
  loader: (await tsImport('@codeadda/content-loader', import.meta.url)) as Loader,
});

export const DEFAULT_CONTENT_DIR = fileURLToPath(new URL('../../../content', import.meta.url));

export async function generateModules(contentDir: string) {
  const { node, loader } = await load();
  const summaries: LabSummary[] = [];
  const sources: Record<string, LabSource> = {};
  for (const full of node.listLabDirs(contentDir)) {
    const dir = basename(full);
    try {
      const source = node.readLabSource(full);
      summaries.push(loader.summarizeLab(loader.buildLab(source), dir));
      sources[dir] = source;
    } catch (e) {
      console.warn(`[lab-content] skipping content/${dir}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return { summaries, sources };
}

const SUMMARIES = 'virtual:lab-summaries';
const LOADERS = 'virtual:lab-content';
const ONE = 'virtual:lab-content/';

export function labContent(contentDir = DEFAULT_CONTENT_DIR): Plugin {
  let cache: ReturnType<typeof generateModules> | undefined;
  const data = () => (cache ??= generateModules(contentDir));
  return {
    name: 'codeadda:lab-content',
    resolveId(id) {
      if (id === SUMMARIES || id === LOADERS || id.startsWith(ONE)) return `\0${id}`;
    },
    async load(id) {
      if (!id.startsWith('\0virtual:lab-')) return;
      const { summaries, sources } = await data();
      const key = id.slice(1);
      if (key === SUMMARIES) return `export const labSummaries = ${JSON.stringify(summaries)};`;
      if (key === LOADERS) {
        const entries = summaries.map((s) => `${JSON.stringify(s.id)}: () => import(${JSON.stringify(ONE + s.dir)})`);
        return `export const labLoaders = {${entries.join(', ')}};`;
      }
      const dir = key.slice(ONE.length);
      if (!sources[dir]) this.error(`No lab content for "${dir}"`);
      return `export default ${JSON.stringify(sources[dir])};`;
    },
    configureServer(server: ViteDevServer) {
      const root = normalize(contentDir);
      server.watcher.add(root);
      const refresh = (file: string) => {
        if (!normalize(file).startsWith(root)) return;
        cache = undefined;
        for (const m of server.moduleGraph.idToModuleMap.values()) {
          if (m.id?.startsWith('\0virtual:lab-')) server.moduleGraph.invalidateModule(m);
        }
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh).on('change', refresh).on('unlink', refresh);
    },
  };
}
```
- [ ] **Step 4: wire it** — in `apps/web/vite.config.ts`: delete `watchContent()` and its `fileURLToPath` import if unused; `import { labContent } from './plugins/labContent';`; `plugins: [stripMonacoCdnDefault(), labContent(), react(), tailwindcss()]`. In root `vitest.config.ts`: `import { labContent } from './apps/web/plugins/labContent';` and add `plugins: [labContent()]` next to `esbuild`. In `apps/web/src/vite-env.d.ts` append:
```ts
declare module 'virtual:lab-summaries' {
  import type { LabSummary } from '@codeadda/core';
  export const labSummaries: LabSummary[];
}
declare module 'virtual:lab-content' {
  import type { LabSource } from '@codeadda/content-loader';
  export const labLoaders: Record<string, () => Promise<{ default: LabSource }>>;
}
```
Root `tsconfig.json` include: add `"apps/*/plugins"`. (If `vitest.config.ts`'s top-level import of the plugin cannot load `tsx/esm/api`, rule on it in the ledger; `tsImport` is called lazily inside hooks, so the import itself is plain JS.)
- [ ] **Step 5:** `npx vitest run apps/web/plugins/labContent.test.ts` → PASS; `npm run typecheck` clean.

---

### Task 3: the registry — `labSummaries` and `loadLab()`

**Files:** Rewrite `apps/web/src/content/registry.ts`; Rewrite `apps/web/src/content/registry.test.ts`.

**Consumes:** `virtual:lab-summaries`, `virtual:lab-content` (Task 2). **Produces:** `labSummaries: LabSummary[]`, `UPCOMING_LABS`, `type UpcomingLab`, `upcomingLabs(live?: { title: string }[])`, `loadLab(id: string): Promise<Lab | undefined>`, `sortByLabOrder<T extends { id: string }>(xs: T[]): T[]`. **Removes:** `labs`, `getLab`, `buildRegistry` (no remaining callers after Task 4 — confirm with grep).

- [ ] **Step 1: failing tests** — replace `apps/web/src/content/registry.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { UPCOMING_LABS, labSummaries, loadLab, sortByLabOrder, upcomingLabs } from './registry';

describe('registry', () => {
  it('lists both live labs as summaries, SQL first', () => {
    expect(labSummaries.map((s) => s.id)).toEqual(['sql', 'postgres']);
    expect(labSummaries[0]).toMatchObject({ title: 'SQL Lab', lessons: 62, problems: 8 });
  });

  it('orders sql → postgres → mongodb → redis → others alphabetically', () => {
    const ids = ['zeta', 'redis', 'alpha', 'postgres', 'sql'].map((id) => ({ id }));
    expect(sortByLabOrder(ids).map((x) => x.id)).toEqual(['sql', 'postgres', 'redis', 'alpha', 'zeta']);
  });

  it('loads one full lab on demand, caches it, and returns undefined for an unknown id', async () => {
    const pg = await loadLab('postgres');
    expect(pg?.lessons.flatMap((c) => c.items)).toHaveLength(46);
    expect(await loadLab('postgres')).toBe(pg);
    expect(await loadLab('nope')).toBeUndefined();
  });
});

describe('upcomingLabs', () => {
  it('lists every upcoming name when none is live', () => expect(upcomingLabs([])).toEqual([...UPCOMING_LABS]));
  it('drops names that are live', () => expect(upcomingLabs([{ title: 'PostgreSQL Lab' }])).toEqual(['MongoDB', 'Redis']));
  it('defaults to the real labs, where SQL and PostgreSQL are live', () => expect(upcomingLabs()).toEqual(['MongoDB', 'Redis']));
});
```
- [ ] **Step 2:** `npx vitest run apps/web/src/content/registry.test.ts` → FAIL (`labSummaries`/`loadLab` not exported).
- [ ] **Step 3: registry** — replace `apps/web/src/content/registry.ts`:
```ts
import { buildLab } from '@codeadda/content-loader';
import type { Lab, LabSummary } from '@codeadda/core';
import { labLoaders } from 'virtual:lab-content';
import { labSummaries as generated } from 'virtual:lab-summaries';

const LAB_ORDER = ['sql', 'postgres', 'mongodb', 'redis'];

export function sortByLabOrder<T extends { id: string }>(xs: T[]): T[] {
  const rank = (id: string) => (LAB_ORDER.includes(id) ? LAB_ORDER.indexOf(id) : LAB_ORDER.length);
  return [...xs].sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
}

/** Small per-lab facts, bundled with the page. Full lessons load through loadLab(). */
export const labSummaries: LabSummary[] = sortByLabOrder(generated);

const cache = new Map<string, Promise<Lab | undefined>>();

/** The full lab, fetched as one chunk the first time it is needed. Unknown ids resolve to undefined. */
export function loadLab(id: string): Promise<Lab | undefined> {
  let p = cache.get(id);
  if (!p) {
    const loader = labLoaders[id];
    p = loader
      ? loader().then((m) => buildLab(m.default)).catch((e: unknown) => {
          cache.delete(id); // let a later visit retry
          throw e;
        })
      : Promise.resolve(undefined);
    cache.set(id, p);
  }
  return p;
}

/** Labs announced in the navbar, lab grid and footer before their content folder exists. */
export const UPCOMING_LABS = ['PostgreSQL', 'MongoDB', 'Redis'] as const;
export type UpcomingLab = (typeof UPCOMING_LABS)[number];

/** Upcoming names that are not yet live. A lab is live once a lab's title starts with the name. */
export function upcomingLabs(live: { title: string }[] = labSummaries): UpcomingLab[] {
  return UPCOMING_LABS.filter((u) => !live.some((l) => l.title.startsWith(u)));
}
```
- [ ] **Step 4:** run the registry test → PASS (typecheck will fail in consumers until Task 4 — expected).

---

### Task 4: consumers — navbar, 404, home page, lab route

**Files:** Modify `apps/web/src/components/Navbar.tsx`, `apps/web/src/components/NotFound.tsx`, `apps/web/src/home/homeContent.ts`, `apps/web/src/home/HomePage.tsx`, `apps/web/src/lab/LabRoute.tsx`; Update tests `apps/web/src/home/homeContent.test.ts`, `apps/web/src/home/HomePage.test.tsx`, `apps/web/src/components/Navbar.test.tsx`, `apps/web/src/components/LabHeader.test.tsx` (Navbar block) as needed; Create `apps/web/src/lab/LabRoute.test.tsx`.

- [ ] **Step 1: failing test** — `apps/web/src/lab/LabRoute.test.tsx` (jsdom):
```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

const loadLab = vi.fn();
vi.mock('../content/registry', async (importActual) => ({ ...(await importActual<object>()), loadLab }));
vi.mock('./useLabEngine', () => ({ useLabEngine: () => ({ status: 'loading', running: false }) }));
const { LabRoute } = await import('./LabRoute');

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Suspense fallback={<p>Loading lab…</p>}>
        <Routes><Route path="/:labId" element={<LabRoute />} /><Route path="/:labId/:tab/:itemId" element={<LabRoute />} /></Routes>
      </Suspense>
    </MemoryRouter>,
  );

describe('LabRoute', () => {
  it('shows the 404 page for an unknown lab without loading anything', () => {
    at('/nope');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(loadLab).not.toHaveBeenCalled();
  });

  it('shows the Suspense fallback while a known lab loads', () => {
    loadLab.mockReturnValue(new Promise(() => {}));
    at('/postgres');
    expect(screen.getByText('Loading lab…')).toBeInTheDocument();
    expect(loadLab).toHaveBeenCalledWith('postgres');
  });
});
```
- [ ] **Step 2:** run it → FAIL (LabRoute still calls `getLab`).
- [ ] **Step 3: LabRoute** — in `apps/web/src/lab/LabRoute.tsx`: import `use` from 'react' and `{ labSummaries, loadLab }` from the registry (drop `getLab`); replace the top of `LabRoute` with:
```tsx
export function LabRoute() {
  const { labId = '' } = useParams();
  // Unknown ids never trigger a download.
  if (!labSummaries.some((s) => s.id === labId)) return <NotFound />;
  return <LoadedLab labId={labId} />;
}

function LoadedLab({ labId }: { labId: string }) {
  const { tab, itemId } = useParams();
  const lab = use(loadLab(labId)); // suspends until the lab's chunk arrives (fallback in App.tsx)
  if (!lab) return <NotFound />;
  // …the rest of the old LabRoute body, unchanged, from `const t: Tab = …` onwards…
}
```
- [ ] **Step 4: home** — `apps/web/src/home/homeContent.ts`: `labStats` and `heroPill` take summaries:
```ts
import type { LabSummary } from '@codeadda/core';
// …
export function labStats(s: LabSummary): LabStats {
  return {
    chapters: s.chapters, lessons: s.lessons, problems: s.problems, animated: s.animated, total: s.lessons + s.problems,
    firstLesson: s.firstLessonId ? itemPath(s.id, 'lessons', s.firstLessonId) : undefined,
    firstProblem: s.firstProblemId ? itemPath(s.id, 'problems', s.firstProblemId) : undefined,
  };
}
export function heroPill(labs: LabSummary[]): string { /* same body as today */ }
```
(remove the now-unused `flatItems`/`Lab` imports). `apps/web/src/home/HomePage.tsx`: import `labSummaries` instead of `labs` and use it everywhere `labs` was used (`labs[0]`, `.map`, `labsHeadline(labs.length, …)`, footer). Every field it reads (`id`, `title`, `subtitle`) exists on `LabSummary`.
- [ ] **Step 5: navbar / 404** — `Navbar.tsx`: `labs` → `labSummaries`. `NotFound.tsx`: `labs[0]` → `labSummaries[0]`.
- [ ] **Step 6: update tests on purpose** — `homeContent.test.ts`: `labStats`/`heroPill` fixtures become `LabSummary` objects with the same expected numbers (`firstLesson` path from `firstLessonId`). `HomePage.test.tsx`: replace `labStats(getLab('sql')!)` with `labStats(labSummaries[0]!)`; registry mocks return `{ ...real, labSummaries: [], upcomingLabs: () => [...real.UPCOMING_LABS] }` (empty) and a two-summary list (second lab) instead of `labs`/`getLab`. Remove any remaining `getLab`/`labs` imports anywhere (`grep -rn "getLab\|\blabs\b" apps/web/src`).
- [ ] **Step 7:** `npm run typecheck && npx vitest run apps/web` → all PASS.

---

### Task 5: e2e — nothing loads early, the right lab loads on demand

**Files:** Modify `e2e/lab.spec.ts` (append a describe block).

- [ ] **Step 1:** append:
```ts
test.describe('lazy lab content', () => {
  const contentRequests = (page: Page) => {
    const urls: string[] = [];
    page.on('request', (r) => { if (r.url().includes('lab-content/')) urls.push(r.url()); });
    return urls;
  };

  test('the home page downloads no lab content', async ({ page }) => {
    const urls = contentRequests(page);
    await page.goto('/');
    await expect(page.getByText('Correct!')).toBeVisible();
    expect(urls).toEqual([]);
  });

  test('a deep link loads only that lab, and switching labs loads the other one', async ({ page }) => {
    const urls = contentRequests(page);
    await page.goto('/postgres/lessons/reading-values');
    await expect(page.getByRole('heading', { level: 1, name: 'Reading JSONB values' })).toBeVisible();
    expect(urls.some((u) => u.includes('lab-content/postgres'))).toBe(true);
    expect(urls.some((u) => u.includes('lab-content/sql'))).toBe(false);
    await page.getByRole('navigation', { name: 'Labs' }).getByRole('link', { name: 'SQL Lab', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'SELECT All Columns' })).toBeVisible();
    expect(urls.some((u) => u.includes('lab-content/sql'))).toBe(true);
  });

  test('an unknown lab shows the 404 page without loading content', async ({ page }) => {
    const urls = contentRequests(page);
    await page.goto('/nope');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    expect(urls).toEqual([]);
  });
});
```
(In dev, Vite serves virtual modules at URLs containing `virtual:lab-content/<dir>` (URL-encoded as `__x00__virtual:lab-content/…`); `includes('lab-content/')` matches both. If the actual URL differs, print the request list once and adjust the match — log a ruling.)
- [ ] **Step 2:** `npx playwright test -g "lazy lab content"` → PASS; then `npm run e2e` → all pass (31 existing + 3 new = 34).

---

### Task 6: measure, dev loop, docs

- [ ] **Step 1: bundle** — `npm run build -w @codeadda/web`; record the `dist/assets` sizes. Expected: entry `index-*.js` **< 250 kB** (was 742.42 kB), plus one chunk per lab content module and the unchanged `LabRoute-*` chunk. Confirm `grep -rl "jsdelivr" apps/web/dist || echo "no CDN"` → `no CDN`. If the entry is still > 250 kB, find what's in it (`npx vite build --mode production` + inspect) and report; don't chase further than the content.
- [ ] **Step 2: dev loop (manual)** — `npx vite --port 5197 --strictPort` from `apps/web` (background). Open `/postgres` once. Create `content/postgres/lessons/01-meet-postgres/99-zz-watch.md` copied from `01-first-query.md` with `id: zz-watch`, `title: Watch test`, `order: 99`; confirm the page reloads and the sidebar shows "Watch test". Then delete that temporary file (it's your own scratch file), confirm it disappears, and stop only the 5197 server. Record what you saw.
- [ ] **Step 3: README** — in "Add your own lesson", keep step 4's "the dev server shows it immediately" (still true) and add one sentence to the Layout section: "Lab content is bundled per lab and loaded when the lab is opened; the home page only gets a small summary of each lab."
- [ ] **Step 4: full verification** — `npm run typecheck && npm test && npm run check-content && npm run e2e`.

## Self-review notes
- Every consumer of `labs`/`getLab` (Navbar, NotFound, HomePage, homeContent, LabRoute) is covered in Task 4; the registry's old `buildRegistry` tests are replaced by summary/order/loadLab tests in Task 3 and the invalid-lab test in Task 2.
- `tsx`-in-config was verified before writing this plan (see Design).
- Types: `LabSummary` (T1) → plugin (T2) → registry (T3) → consumers (T4).
