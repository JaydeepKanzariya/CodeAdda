# Stage 1 — Foundation + SQL Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local web app at `D:\Jaydeep\codeadda` where the learner picks the SQL lab, works through
63 original lessons and 10 problems, runs queries against real Postgres in the browser, gets
automatic answer checking, hints, solutions, schema/sample data and reset — styled with the
reference lab's tokens in light and dark themes.

**Architecture:** npm-workspaces monorepo. `packages/core` holds shared types, result comparison
and the grader. `packages/content-loader` turns Markdown lesson files into a `Lab`.
`packages/engine-pglite` wraps PGlite behind the `Engine` interface. `apps/web` (React + Vite +
Tailwind v4) runs each engine inside a Web Worker (for timeouts) and renders the lab UI. A
`check-content` script runs every solution in Node.

**Tech Stack:** Node 22, TypeScript 5.9 (strict), React 19, Vite 7, Tailwind CSS 4, React Router 7,
@electric-sql/pglite 0.3, @monaco-editor/react 4.7, react-markdown 10 + remark-gfm 4, yaml 2,
zod 3.25, Vitest 3, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-29-codeadda-design.md` (read it before starting).

## Global Constraints

- **No git commits in this project.** The owner commits later. Skip every commit step; leave changes in the working tree.
- Node `>=22`; TypeScript `strict: true`; ESM everywhere (`"type": "module"`).
- Workspace package names: `@codeadda/core`, `@codeadda/content-loader`, `@codeadda/engine-pglite`, `@codeadda/web`. Packages export TypeScript source directly (`"exports": { ".": "./src/index.ts" }`); there is no build step for packages.
- Query timeout: **5 seconds** (`5000` ms), then the engine restarts and restores the lesson data.
- Result display cap: **1,000 rows**.
- Layout: navbar **56px**, sidebar **300px**, sidebar becomes a drawer below **900px** (Tailwind breakpoint `lab` = `56.25rem`).
- Design tokens use exactly the names and values in spec §5.3; the accent lives in one group (`--color-accent*`). Tailwind keys use *different* names (see Task 6) so no variable references itself.
- Fonts: "Inter Variable" (UI) and "JetBrains Mono Variable" (code), self-hosted via `@fontsource-variable/*`.
- All lesson and problem text is **original** — do not copy wording from ChaiCode or any other course.
- Brand placeholder: **"CodeAdda"**.
- Lesson files: one Markdown file each with YAML front-matter; see spec §4.2 and Task 3.

## Deviations from the spec (intentional, already reflected in the spec)

- `Engine.snapshot(query: string)` instead of a `SnapshotSpec` object.
- Checking runs learner query and solution on a separate grader engine, no caching.
- CI is deferred until the repo has a remote; all checks run through npm scripts.

## Review Focus

1. **Results with duplicate column names** (e.g. `SELECT p.id, t.id …`) must show both columns and compare by position, not collapse into one — test in Task 4.
2. **DATE / NUMERIC / BIGINT values** must display exactly as Postgres prints them (`2024-01-05`, `95000.00`, no timezone shift) and `"95000.00"` must compare equal to `95000` — tests in Task 1 and Task 4.
3. **A query that never finishes** (e.g. `WITH RECURSIVE` without a stop) must time out after 5 s, restore the lesson data and leave the lab usable — test in Task 7.
4. **An open or aborted transaction** (`BEGIN;` then an error) must not break Reset DB or later lessons — test in Task 4.
5. **The learner destroying data** (`DROP TABLE …`) must not affect checking (grader uses a fresh copy) and Reset DB must restore it — tests in Task 2, Task 4 and Task 15 (e2e).

---

## File Structure

```
codeadda/
├── package.json                 root workspace + scripts
├── tsconfig.base.json / tsconfig.json
├── vitest.config.ts / vitest.setup.ts
├── playwright.config.ts
├── README.md
├── packages/
│   ├── core/src/
│   │   ├── types.ts             Engine, QueryResult, Lab, LessonItem, SchemaInfo …
│   │   ├── compare.ts           normalizeCell, rowKey, compareResults, markRows
│   │   ├── grader.ts            grade(): runs learner + solution, returns CheckResult
│   │   ├── dataset.ts           resolveDataset()
│   │   └── index.ts
│   ├── content-loader/src/
│   │   ├── frontmatter.ts       splitFrontMatter()
│   │   ├── sections.ts          splitSections(), firstCodeBlock(), parseHints()
│   │   ├── schema.ts            zod schemas for lesson front-matter and lab.json
│   │   ├── parseItem.ts         one Markdown file → LessonItem | ContentError
│   │   ├── buildLab.ts          lab.json + files → Lab
│   │   ├── node.ts              read a lab from disk (Node only)
│   │   └── index.ts
│   └── engine-pglite/src/
│       ├── PgliteEngine.ts      Engine over PGlite
│       ├── describe.ts          catalog queries → SchemaInfo
│       └── index.ts
├── scripts/
│   ├── checkLab.ts              verify every solution of a Lab
│   └── check-content.ts         CLI entry (npm run check-content)
├── content/sql/
│   ├── lab.json
│   ├── datasets/shop.sql
│   ├── lessons/<NN-chapter>/<NN-slug>.md
│   └── problems/<NN-group>/<NN-slug>.md
├── e2e/lab.spec.ts
└── apps/web/
    ├── index.html / vite.config.ts / package.json
    └── src/
        ├── main.tsx / App.tsx / vite-env.d.ts
        ├── styles/tokens.css    design tokens (light/dark)
        ├── styles/app.css       Tailwind + @theme mapping + markdown styles
        ├── lib/cx.ts
        ├── state/storage.ts     safe localStorage wrapper
        ├── state/prefs.ts       theme, font scale, sidebar collapsed
        ├── state/progress.ts    completed items + drafts
        ├── content/registry.ts  import.meta.glob → Lab[]
        ├── engine/protocol.ts / engine.worker.ts / WorkerEngine.ts / createEngine.ts
        ├── lab/navigation.ts    item lists, paths, numbering
        ├── lab/LabRoute.tsx     route resolution + LabView layout
        ├── lab/useLabEngine.ts  engine lifecycle, run/check/reset
        ├── lab/LessonFlow.tsx   the lesson page body
        └── components/          Navbar, ThemeToggle, NotFound, LabHeader, ModeTabs,
                                 FontSizeSettings, Sidebar, DifficultyBadge, Markdown,
                                 LessonHeader, ResultTable, ResultsPanel, CheckBanner,
                                 SchemaViewer, QueryEditor, HintToggle, SolutionPanel,
                                 ErrorScreen
```

---

### Task 1: Monorepo scaffold, core types and result comparison

**Files:**
- Create: `package.json`, `.gitignore`, `tsconfig.base.json`, `tsconfig.json`, `vitest.config.ts`
- Create: `packages/core/package.json`, `packages/core/src/types.ts`, `packages/core/src/compare.ts`, `packages/core/src/index.ts`
- Test: `packages/core/src/compare.test.ts`

**Interfaces:**
- Produces (used by every later task): all types in `types.ts`; `normalizeCell(v: unknown): unknown`, `rowKey(row: unknown[]): string`, `compareResults(expected: QuerySuccess, actual: QuerySuccess, ordered: boolean): Comparison`, `markRows(rows: unknown[][], targets: unknown[][]): Set<number>`.

- [ ] **Step 1: Create the root files**

`package.json`:
```json
{
  "name": "codeadda",
  "private": true,
  "type": "module",
  "workspaces": ["apps/*", "packages/*"],
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "npm run dev -w @codeadda/web",
    "build": "npm run build -w @codeadda/web",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -p tsconfig.json",
    "check-content": "tsx scripts/check-content.ts",
    "e2e": "playwright test"
  }
}
```

`.gitignore`:
```
node_modules/
dist/
.vite/
test-results/
playwright-report/
*.log
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"]
  }
}
```

`tsconfig.json`:
```json
{
  "extends": "./tsconfig.base.json",
  "include": ["packages/*/src", "apps/*/src", "apps/*/vite.config.ts", "scripts", "e2e", "*.ts"]
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    globals: true,
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    testTimeout: 30_000,
  },
});
```

`packages/core/package.json`:
```json
{
  "name": "@codeadda/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" }
}
```

- [ ] **Step 2: Install root dev dependencies**

Run (in `D:\Jaydeep\codeadda`): `npm install -D typescript@^5.9 vitest@^3.2 @types/node@^22 tsx@^4`
Expected: `node_modules/` created, `package.json` gains `devDependencies`, and `node_modules/@codeadda/core` is a link to `packages/core`.

- [ ] **Step 3: Write the core types**

`packages/core/src/types.ts`:
```ts
export type LabLanguage = 'sql' | 'mongodb' | 'redis';
export type EngineMode = 'browser' | 'real';

export interface QuerySuccess {
  ok: true;
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  durationMs: number;
  notice?: string;
}

export interface QueryFailure {
  ok: false;
  error: { message: string; position?: number; code?: string };
}

export type QueryResult = QuerySuccess | QueryFailure;

export interface Dataset {
  name: string;
  source: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimary: boolean;
  isForeign: boolean;
  references?: string;
}

export interface TableInfo {
  name: string;
  description?: string;
  rowCount: number;
  columns: ColumnInfo[];
  sampleQuery: string;
}

export interface Relationship {
  from: string;
  column: string;
  to: string;
  toColumn: string;
}

export interface SchemaInfo {
  tables: TableInfo[];
  relationships: Relationship[];
}

export interface RunOptions {
  timeoutMs?: number;
}

export interface Engine {
  readonly kind: LabLanguage;
  readonly mode: EngineMode;
  /** Remember the dataset and reset the sandbox to it. */
  setup(dataset: Dataset): Promise<void>;
  run(query: string, opts?: RunOptions): Promise<QueryResult>;
  /** Restore the sandbox to the last dataset passed to setup(). */
  reset(): Promise<void>;
  /** Read state for `state` checks. */
  snapshot(query: string): Promise<QueryResult>;
  describe(): Promise<SchemaInfo>;
  dispose(): Promise<void>;
}

export type CheckMode = 'rows-unordered' | 'rows-ordered' | 'state' | 'custom';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type ItemKind = 'lesson' | 'problem';

export interface LessonItem {
  kind: ItemKind;
  id: string;
  title: string;
  chapter: string;
  order: number;
  dataset?: string;
  setup?: string;
  check: CheckMode;
  checkQuery?: string;
  difficulty?: Difficulty;
  body: string;
  task: string;
  hints: string[];
  example?: string;
  solution: string;
  path: string;
}

export interface ContentError {
  path: string;
  message: string;
}

export interface Chapter {
  title: string;
  items: LessonItem[];
}

export interface Lab {
  id: string;
  title: string;
  subtitle: string;
  language: LabLanguage;
  lessons: Chapter[];
  problems: Chapter[];
  datasets: Record<string, string>;
  errors: ContentError[];
}
```

- [ ] **Step 4: Write the failing comparison tests**

`packages/core/src/compare.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { compareResults, markRows, normalizeCell, rowKey } from './compare';
import type { QuerySuccess } from './types';

const res = (columns: string[], rows: unknown[][]): QuerySuccess => ({
  ok: true, columns, rows, rowCount: rows.length, durationMs: 0,
});

describe('normalizeCell', () => {
  it('treats numeric strings and numbers as equal', () => {
    expect(normalizeCell('95000.00')).toBe(95000);
    expect(normalizeCell(95000)).toBe(95000);
    expect(normalizeCell('-3.5')).toBe(-3.5);
  });
  it('leaves other strings, null and booleans alone', () => {
    expect(normalizeCell('2024-01-05')).toBe('2024-01-05');
    expect(normalizeCell(null)).toBeNull();
    expect(normalizeCell(true)).toBe(true);
  });
  it('turns bigint into number and objects into JSON', () => {
    expect(normalizeCell(12n)).toBe(12);
    expect(normalizeCell({ a: 1 })).toBe('{"a":1}');
  });
});

describe('compareResults', () => {
  it('passes unordered results in any order', () => {
    const r = compareResults(res(['id'], [[1], [2]]), res(['id'], [[2], [1]]), false);
    expect(r.pass).toBe(true);
  });

  it('fails ordered results in the wrong order but reports no missing rows', () => {
    const r = compareResults(res(['id'], [[1], [2]]), res(['id'], [[2], [1]]), true);
    expect(r.pass).toBe(false);
    expect(r.reason).toMatch(/wrong order/i);
    expect(r.missing).toEqual([]);
    expect(r.extra).toEqual([]);
  });

  it('matches column names case-insensitively', () => {
    expect(compareResults(res(['Name'], [['a']]), res(['name'], [['a']]), false).pass).toBe(true);
  });

  it('fails on a different number of columns', () => {
    const r = compareResults(res(['a', 'b'], [[1, 2]]), res(['a'], [[1]]), false);
    expect(r.pass).toBe(false);
    expect(r.reason).toMatch(/2 column/);
  });

  it('fails on a differently named column', () => {
    const r = compareResults(res(['total'], [[1]]), res(['count'], [[1]]), false);
    expect(r.pass).toBe(false);
    expect(r.reason).toMatch(/"total"/);
  });

  it('treats rows as a multiset and reports missing and extra rows', () => {
    const r = compareResults(res(['n'], [[1], [1], [2]]), res(['n'], [[1], [3]]), false);
    expect(r.pass).toBe(false);
    expect(r.missing).toEqual([[1], [2]]);
    expect(r.extra).toEqual([[3]]);
  });

  it('compares numeric strings with numbers', () => {
    expect(compareResults(res(['p'], [['95000.00']]), res(['p'], [[95000]]), false).pass).toBe(true);
  });
});

describe('markRows', () => {
  it('marks each target row once, by value', () => {
    expect(markRows([[1], [2], [1]], [[1]])).toEqual(new Set([0]));
    expect(markRows([[1], [2], [1]], [[1], [1]])).toEqual(new Set([0, 2]));
  });
});

describe('rowKey', () => {
  it('is equal for rows that normalise to the same values', () => {
    expect(rowKey(['1.0', 'x'])).toBe(rowKey([1, 'x']));
  });
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npx vitest run packages/core`
Expected: FAIL — cannot resolve `./compare`.

- [ ] **Step 6: Implement comparison**

`packages/core/src/compare.ts`:
```ts
import type { QuerySuccess } from './types';

const NUMERIC = /^-?\d+(\.\d+)?$/;

export function normalizeCell(v: unknown): unknown {
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'string' && NUMERIC.test(v.trim())) return Number(v);
  if (v instanceof Date) return v.toISOString();
  if (v !== null && typeof v === 'object') return JSON.stringify(v);
  return v;
}

export function rowKey(row: unknown[]): string {
  return JSON.stringify(row.map(normalizeCell));
}

export interface Comparison {
  pass: boolean;
  reason: string;
  missing: unknown[][];
  extra: unknown[][];
}

function counts(rows: unknown[][]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = rowKey(r);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export function compareResults(expected: QuerySuccess, actual: QuerySuccess, ordered: boolean): Comparison {
  const fail = (reason: string, missing: unknown[][] = [], extra: unknown[][] = []): Comparison => ({
    pass: false, reason, missing, extra,
  });

  if (expected.columns.length !== actual.columns.length) {
    return fail(
      `Expected ${expected.columns.length} column(s) (${expected.columns.join(', ')}), ` +
        `got ${actual.columns.length} (${actual.columns.join(', ') || 'none'}).`,
    );
  }
  const bad = expected.columns.findIndex((c, i) => c.toLowerCase() !== actual.columns[i]!.toLowerCase());
  if (bad >= 0) {
    return fail(`Column ${bad + 1} should be named "${expected.columns[bad]}", got "${actual.columns[bad]}".`);
  }

  const remaining = counts(actual.rows);
  const missing: unknown[][] = [];
  for (const row of expected.rows) {
    const k = rowKey(row);
    const n = remaining.get(k) ?? 0;
    if (n > 0) remaining.set(k, n - 1);
    else missing.push(row);
  }
  const extraCounts = new Map(remaining);
  const extra: unknown[][] = [];
  for (const row of actual.rows) {
    const k = rowKey(row);
    const n = extraCounts.get(k) ?? 0;
    if (n > 0) {
      extra.push(row);
      extraCounts.set(k, n - 1);
    }
  }

  if (missing.length || extra.length) {
    return fail(`${missing.length} expected row(s) missing and ${extra.length} unexpected row(s).`, missing, extra);
  }
  if (ordered && expected.rows.some((row, i) => rowKey(row) !== rowKey(actual.rows[i]!))) {
    return fail('You have the right rows, but in the wrong order.');
  }
  return { pass: true, reason: 'Your result matches the expected result.', missing: [], extra: [] };
}

/** Indexes of `rows` that match `targets`, each target used once. */
export function markRows(rows: unknown[][], targets: unknown[][]): Set<number> {
  const left = counts(targets);
  const marked = new Set<number>();
  rows.forEach((row, i) => {
    const k = rowKey(row);
    const n = left.get(k) ?? 0;
    if (n > 0) {
      marked.add(i);
      left.set(k, n - 1);
    }
  });
  return marked;
}
```

`packages/core/src/index.ts`:
```ts
export * from './types';
export * from './compare';
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run packages/core`
Expected: PASS (all tests in `compare.test.ts`).

- [ ] **Step 8: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

---

### Task 2: Grader and dataset resolution

**Files:**
- Create: `packages/core/src/grader.ts`, `packages/core/src/dataset.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/grader.test.ts`

**Interfaces:**
- Consumes: `Engine`, `LessonItem`, `Dataset`, `Lab`, `compareResults` (Task 1).
- Produces: `CHECK_TIMEOUT_MS = 5000`; `interface CheckResult { pass: boolean; reason: string; expected?: QuerySuccess; actual?: QuerySuccess; missing: unknown[][]; extra: unknown[][] }`; `grade(engine: Engine, item: LessonItem, dataset: Dataset, learnerQuery: string): Promise<CheckResult>` (throws `Error` only when the lesson's own solution/check query fails); `resolveDataset(lab: Pick<Lab, 'datasets'>, item: LessonItem): Dataset`.

- [ ] **Step 1: Write the failing tests**

`packages/core/src/grader.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { grade } from './grader';
import { resolveDataset } from './dataset';
import type { Dataset, Engine, LessonItem, QueryResult, QuerySuccess, SchemaInfo } from './types';

const ok = (columns: string[], rows: unknown[][]): QuerySuccess => ({
  ok: true, columns, rows, rowCount: rows.length, durationMs: 0,
});

class FakeEngine implements Engine {
  readonly kind = 'sql' as const;
  readonly mode = 'browser' as const;
  calls: string[] = [];
  constructor(private responses: Record<string, QueryResult>) {}
  async setup(_d: Dataset) { this.calls.push('setup'); }
  async run(q: string): Promise<QueryResult> {
    this.calls.push(`run:${q}`);
    return this.responses[q] ?? { ok: false, error: { message: `unknown query ${q}` } };
  }
  async reset() { this.calls.push('reset'); }
  async snapshot(q: string) { return this.run(q); }
  async describe(): Promise<SchemaInfo> { return { tables: [], relationships: [] }; }
  async dispose() {}
}

const item = (over: Partial<LessonItem> = {}): LessonItem => ({
  kind: 'lesson', id: 'demo', title: 'Demo', chapter: 'Basics', order: 1, dataset: 'shop',
  check: 'rows-unordered', body: '', task: 'Do it', hints: [], solution: 'SOLUTION', path: 'x.md',
  ...over,
});
const ds: Dataset = { name: 'shop', source: 'CREATE TABLE t (n int);' };

describe('grade', () => {
  it('runs the learner query and the solution on fresh copies and passes when they match', async () => {
    const engine = new FakeEngine({ LEARNER: ok(['n'], [[2], [1]]), SOLUTION: ok(['n'], [[1], [2]]) });
    const r = await grade(engine, item(), ds, 'LEARNER');
    expect(r.pass).toBe(true);
    expect(engine.calls).toEqual(['setup', 'run:LEARNER', 'reset', 'run:SOLUTION']);
  });

  it('fails with the error message when the learner query fails', async () => {
    const engine = new FakeEngine({ SOLUTION: ok(['n'], [[1]]) });
    const r = await grade(engine, item(), ds, 'BROKEN');
    expect(r.pass).toBe(false);
    expect(r.reason).toMatch(/unknown query BROKEN/);
  });

  it('uses the check query for state lessons', async () => {
    const engine = new FakeEngine({
      LEARNER: ok([], []), SOLUTION: ok([], []), CHECK: ok(['n'], [[1]]),
    });
    const r = await grade(engine, item({ check: 'state', checkQuery: 'CHECK' }), ds, 'LEARNER');
    expect(r.pass).toBe(true);
    expect(engine.calls).toEqual(['setup', 'run:LEARNER', 'run:CHECK', 'reset', 'run:SOLUTION', 'run:CHECK']);
  });

  it('fails a state lesson when the check query fails after the learner query (e.g. table dropped)', async () => {
    const engine = new FakeEngine({ 'DROP TABLE t': ok([], []), SOLUTION: ok([], []) });
    const r = await grade(engine, item({ check: 'state', checkQuery: 'CHECK' }), ds, 'DROP TABLE t');
    expect(r.pass).toBe(false);
    expect(r.reason).toMatch(/check could not run/i);
  });

  it('passes a custom lesson when the check query returns a truthy first value', async () => {
    const engine = new FakeEngine({ LEARNER: ok([], []), CHECK: ok(['ok'], [[true]]) });
    expect((await grade(engine, item({ check: 'custom', checkQuery: 'CHECK' }), ds, 'LEARNER')).pass).toBe(true);
  });

  it('throws when the lesson solution itself fails', async () => {
    const engine = new FakeEngine({ LEARNER: ok(['n'], [[1]]) });
    await expect(grade(engine, item(), ds, 'LEARNER')).rejects.toThrow(/demo: solution failed/);
  });
});

describe('resolveDataset', () => {
  it('uses the named dataset', () => {
    expect(resolveDataset({ datasets: { shop: 'SQL' } }, item())).toEqual({ name: 'shop', source: 'SQL' });
  });
  it('prefers an inline setup block', () => {
    expect(resolveDataset({ datasets: {} }, item({ dataset: undefined, setup: 'CREATE TABLE x ();' })))
      .toEqual({ name: 'setup:demo', source: 'CREATE TABLE x ();' });
  });
  it('throws when the dataset is missing', () => {
    expect(() => resolveDataset({ datasets: {} }, item())).toThrow(/no dataset/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run packages/core/src/grader.test.ts`
Expected: FAIL — cannot resolve `./grader`.

- [ ] **Step 3: Implement the grader and dataset resolution**

`packages/core/src/grader.ts`:
```ts
import { compareResults } from './compare';
import type { Dataset, Engine, LessonItem, QueryResult, QuerySuccess } from './types';

export const CHECK_TIMEOUT_MS = 5000;

export interface CheckResult {
  pass: boolean;
  reason: string;
  expected?: QuerySuccess;
  actual?: QuerySuccess;
  missing: unknown[][];
  extra: unknown[][];
}

const opts = { timeoutMs: CHECK_TIMEOUT_MS };

function fail(reason: string): CheckResult {
  return { pass: false, reason, missing: [], extra: [] };
}

function isTruthy(v: unknown): boolean {
  if (typeof v === 'string') return ['t', 'true', '1'].includes(v.toLowerCase());
  return v === true || v === 1;
}

async function mustRun(engine: Engine, item: LessonItem, query: string, label: string): Promise<QuerySuccess> {
  const r: QueryResult = await engine.run(query, opts);
  if (!r.ok) throw new Error(`Lesson ${item.id}: ${label} failed: ${r.error.message}`);
  return r;
}

/**
 * Checks a learner query against the lesson. Runs everything on `engine`, which must be a
 * scratch engine (it is reset). Throws only when the lesson's own solution or check query fails.
 */
export async function grade(engine: Engine, item: LessonItem, dataset: Dataset, learnerQuery: string): Promise<CheckResult> {
  await engine.setup(dataset);
  const learner = await engine.run(learnerQuery, opts);
  if (!learner.ok) return fail(`Your query failed: ${learner.error.message}`);

  if (item.check === 'custom') {
    const r = await engine.run(item.checkQuery!, opts);
    const pass = r.ok && isTruthy(r.rows[0]?.[0]);
    return pass
      ? { pass, reason: 'Your change passes the lesson check.', missing: [], extra: [] }
      : fail('The result does not meet the lesson requirement yet.');
  }

  let actual: QuerySuccess = learner;
  if (item.check === 'state') {
    const state = await engine.run(item.checkQuery!, opts);
    if (!state.ok) return fail(`After your query, the lesson check could not run: ${state.error.message}`);
    actual = state;
  }

  await engine.reset();
  const solution = await mustRun(engine, item, item.solution, 'solution');
  const expected = item.check === 'state' ? await mustRun(engine, item, item.checkQuery!, 'check query') : solution;

  const cmp = compareResults(expected, actual, item.check === 'rows-ordered');
  return { ...cmp, expected, actual };
}
```

`packages/core/src/dataset.ts`:
```ts
import type { Dataset, Lab, LessonItem } from './types';

export function resolveDataset(lab: Pick<Lab, 'datasets'>, item: LessonItem): Dataset {
  if (item.setup) return { name: `setup:${item.id}`, source: item.setup };
  const source = item.dataset ? lab.datasets[item.dataset] : undefined;
  if (source === undefined) throw new Error(`Lesson ${item.id} has no dataset`);
  return { name: item.dataset!, source };
}
```

Replace `packages/core/src/index.ts`:
```ts
export * from './types';
export * from './compare';
export * from './grader';
export * from './dataset';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run packages/core`
Expected: PASS.

---

### Task 3: Content loader

**Files:**
- Create: `packages/content-loader/package.json`, `src/frontmatter.ts`, `src/sections.ts`, `src/schema.ts`, `src/parseItem.ts`, `src/buildLab.ts`, `src/node.ts`, `src/index.ts`
- Test: `packages/content-loader/src/parseItem.test.ts`, `packages/content-loader/src/buildLab.test.ts`

**Interfaces:**
- Consumes: `LessonItem`, `ContentError`, `Lab`, `Chapter`, `ItemKind` (Task 1).
- Produces: `splitFrontMatter(raw: string): { data: unknown; body: string }`; `splitSections(body: string): { intro: string; sections: Record<string, string> }` (keys lower-cased); `firstCodeBlock(md: string): string | undefined`; `parseHints(md: string): string[]`; `parseItem(path: string, raw: string, kind: ItemKind): LessonItem | ContentError`; `isContentError(x: LessonItem | ContentError): x is ContentError`; `interface LabSource { labJson: string; files: Record<string, string> }` (file keys are paths relative to the lab folder with `/` separators, e.g. `lessons/01-querying/01-select-all.md`, `datasets/shop.sql`); `buildLab(src: LabSource): Lab` (throws only if `lab.json` is invalid). From `@codeadda/content-loader/node`: `readLabSource(dir: string): LabSource`, `loadLabFromDir(dir: string): Lab`, `listLabDirs(contentRoot: string): string[]`.

**Lesson file rules** (enforced here): front-matter keys `id` (`[a-z0-9-]+`), `title`, `chapter`, `order` (integer), optional `dataset`, `check` (default `rows-unordered`), `checkQuery` (required for `state`/`custom`), `difficulty` (required for problems). Body sections: text before the first `## ` heading is the explanation; `## Task` (required), `## Hint` or `## Hints` (bullets = several hints), `## Example`, `## Setup` (code block, replaces the dataset), `## Solution` (required, first code block). `## ` lines inside fenced code blocks are not headings.

- [ ] **Step 1: Create the package and install dependencies**

`packages/content-loader/package.json`:
```json
{
  "name": "@codeadda/content-loader",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts", "./node": "./src/node.ts" },
  "dependencies": { "@codeadda/core": "*" }
}
```

Run: `npm install yaml@^2 zod@^3.25 -w @codeadda/content-loader`
Expected: both appear in `packages/content-loader/package.json` dependencies.

- [ ] **Step 2: Write the failing parser tests**

`packages/content-loader/src/parseItem.test.ts`:
````ts
import { describe, expect, it } from 'vitest';
import { firstCodeBlock, parseHints, splitSections } from './sections';
import { splitFrontMatter } from './frontmatter';
import { isContentError, parseItem } from './parseItem';

const lesson = `---
id: where-clause
title: WHERE Clause
chapter: Filtering Data
order: 9
dataset: shop
---

Filter rows.

\`\`\`sql
## not a heading
SELECT 1;
\`\`\`

## Task
Select users from the USA.

## Hint
- Use WHERE.
- Text needs single quotes.

## Solution
\`\`\`sql
SELECT * FROM users WHERE country = 'USA';
\`\`\`
`;

describe('splitFrontMatter', () => {
  it('parses YAML and handles CRLF line endings', () => {
    const { data, body } = splitFrontMatter('---\r\nid: a\r\n---\r\nHello');
    expect(data).toEqual({ id: 'a' });
    expect(body).toBe('Hello');
  });
  it('throws when there is no front-matter', () => {
    expect(() => splitFrontMatter('# Title')).toThrow(/front-matter/);
  });
});

describe('sections', () => {
  it('ignores ## lines inside code fences', () => {
    const { intro, sections } = splitSections(splitFrontMatter(lesson).body);
    expect(intro).toContain('## not a heading');
    expect(Object.keys(sections)).toEqual(['task', 'hint', 'solution']);
  });
  it('extracts the first code block', () => {
    expect(firstCodeBlock('text\n```sql\nSELECT 1;\n```\n')).toBe('SELECT 1;');
    expect(firstCodeBlock('no code')).toBeUndefined();
  });
  it('splits bullet hints and keeps a paragraph as one hint', () => {
    expect(parseHints('- one\n- two\n  more')).toEqual(['one', 'two\n  more']);
    expect(parseHints('Just a sentence.')).toEqual(['Just a sentence.']);
    expect(parseHints('')).toEqual([]);
  });
});

describe('parseItem', () => {
  it('parses a lesson', () => {
    const item = parseItem('lessons/03/09.md', lesson, 'lesson');
    expect(isContentError(item)).toBe(false);
    if (isContentError(item)) return;
    expect(item).toMatchObject({
      kind: 'lesson', id: 'where-clause', chapter: 'Filtering Data', order: 9, dataset: 'shop',
      check: 'rows-unordered', task: 'Select users from the USA.',
      hints: ['Use WHERE.', 'Text needs single quotes.'],
      solution: "SELECT * FROM users WHERE country = 'USA';",
    });
    expect(item.body.startsWith('Filter rows.')).toBe(true);
  });

  it('reports a missing solution', () => {
    const r = parseItem('x.md', lesson.replace(/## Solution[\s\S]*$/, ''), 'lesson');
    expect(r).toEqual({ path: 'x.md', message: 'Missing "## Solution" section with a code block' });
  });

  it('requires checkQuery for state checks', () => {
    const r = parseItem('x.md', lesson.replace('dataset: shop', 'dataset: shop\ncheck: state'), 'lesson');
    expect(isContentError(r) && r.message).toMatch(/checkQuery/);
  });

  it('requires difficulty for problems', () => {
    const r = parseItem('x.md', lesson, 'problem');
    expect(isContentError(r) && r.message).toMatch(/difficulty/);
  });

  it('requires a dataset or a setup section', () => {
    const r = parseItem('x.md', lesson.replace('dataset: shop\n', ''), 'lesson');
    expect(isContentError(r) && r.message).toMatch(/dataset/);
  });
});
````

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run packages/content-loader`
Expected: FAIL — cannot resolve `./sections`.

- [ ] **Step 4: Implement front-matter, sections, schemas and parseItem**

`packages/content-loader/src/frontmatter.ts`:
```ts
import { parse } from 'yaml';

export function splitFrontMatter(raw: string): { data: unknown; body: string } {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) throw new Error('Missing front-matter block (--- … ---) at the top of the file');
  return { data: parse(m[1]!) ?? {}, body: text.slice(m[0].length) };
}
```

`packages/content-loader/src/sections.ts`:
```ts
const FENCE = /^\s*(```|~~~)/;
const HEADING = /^## (.+?)\s*$/;

export function splitSections(body: string): { intro: string; sections: Record<string, string> } {
  const buckets = new Map<string, string[]>();
  const intro: string[] = [];
  let current = intro;
  let inFence = false;
  for (const line of body.split('\n')) {
    if (FENCE.test(line)) inFence = !inFence;
    const h = inFence ? null : HEADING.exec(line);
    if (h) {
      current = [];
      buckets.set(h[1]!.toLowerCase(), current);
      continue;
    }
    current.push(line);
  }
  const sections: Record<string, string> = {};
  for (const [k, lines] of buckets) sections[k] = lines.join('\n').trim();
  return { intro: intro.join('\n').trim(), sections };
}

export function firstCodeBlock(md: string): string | undefined {
  const m = /(```|~~~)[^\n]*\n([\s\S]*?)\n\1/.exec(md);
  return m ? m[2]!.trim() : undefined;
}

export function parseHints(md: string): string[] {
  const text = md.trim();
  if (!text) return [];
  if (!/^[-*]\s+/.test(text)) return [text];
  return text
    .split(/^[-*]\s+/m)
    .map((h) => h.replace(/\s+$/, ''))
    .filter((h) => h.trim().length > 0);
}
```

`packages/content-loader/src/schema.ts`:
```ts
import { z } from 'zod';

export const itemFrontMatter = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'id may only contain a-z, 0-9 and -'),
    title: z.string().min(1),
    chapter: z.string().min(1),
    order: z.number().int(),
    dataset: z.string().min(1).optional(),
    check: z.enum(['rows-unordered', 'rows-ordered', 'state', 'custom']).default('rows-unordered'),
    checkQuery: z.string().min(1).optional(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
  })
  .superRefine((v, ctx) => {
    if ((v.check === 'state' || v.check === 'custom') && !v.checkQuery) {
      ctx.addIssue({ code: 'custom', path: ['checkQuery'], message: `checkQuery is required when check is "${v.check}"` });
    }
  });

export const labJson = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  subtitle: z.string().default(''),
  language: z.enum(['sql', 'mongodb', 'redis']),
  chapters: z.array(z.string().min(1)).min(1),
  problemGroups: z.array(z.string().min(1)).default([]),
});

export function formatZodError(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
}
```

`packages/content-loader/src/parseItem.ts`:
```ts
import type { ContentError, ItemKind, LessonItem } from '@codeadda/core';
import { splitFrontMatter } from './frontmatter';
import { firstCodeBlock, parseHints, splitSections } from './sections';
import { formatZodError, itemFrontMatter } from './schema';

export function isContentError(x: LessonItem | ContentError): x is ContentError {
  return !('kind' in x);
}

export function parseItem(path: string, raw: string, kind: ItemKind): LessonItem | ContentError {
  const err = (message: string): ContentError => ({ path, message });
  try {
    const { data, body } = splitFrontMatter(raw);
    const fm = itemFrontMatter.safeParse(data);
    if (!fm.success) return err(formatZodError(fm.error));
    const front = fm.data;

    const { intro, sections } = splitSections(body);
    const task = sections['task'];
    if (!task) return err('Missing "## Task" section');
    const solution = sections['solution'] ? firstCodeBlock(sections['solution']) : undefined;
    if (!solution) return err('Missing "## Solution" section with a code block');
    const setup = sections['setup'] ? firstCodeBlock(sections['setup']) : undefined;
    if (!front.dataset && !setup) return err('Set "dataset" in the front-matter or add a "## Setup" section');
    if (kind === 'problem' && !front.difficulty) return err('Problems need a "difficulty" (Easy, Medium or Hard)');

    return {
      kind,
      id: front.id,
      title: front.title,
      chapter: front.chapter,
      order: front.order,
      dataset: front.dataset,
      setup,
      check: front.check,
      checkQuery: front.checkQuery,
      difficulty: front.difficulty,
      body: intro,
      task,
      hints: parseHints(sections['hint'] ?? sections['hints'] ?? ''),
      example: sections['example'] || undefined,
      solution,
      path,
    };
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}
```

- [ ] **Step 5: Run the parser tests to verify they pass**

Run: `npx vitest run packages/content-loader/src/parseItem.test.ts`
Expected: PASS.

- [ ] **Step 6: Write the failing buildLab tests**

`packages/content-loader/src/buildLab.test.ts`:
````ts
import { describe, expect, it } from 'vitest';
import { buildLab } from './buildLab';

const labJson = JSON.stringify({
  id: 'demo', title: 'Demo Lab', subtitle: 'Try it', language: 'sql',
  chapters: ['Basics', 'More'], problemGroups: ['Warm-up'],
});

const file = (id: string, chapter: string, order: number, extra = '') => `---
id: ${id}
title: ${id} title
chapter: ${chapter}
order: ${order}
dataset: tiny
${extra}---

Intro.

## Task
Do it.

## Solution
\`\`\`sql
SELECT 1;
\`\`\`
`;

describe('buildLab', () => {
  it('groups lessons by chapter in lab.json order and sorts by order', () => {
    const lab = buildLab({
      labJson,
      files: {
        'datasets/tiny.sql': 'CREATE TABLE t (n int);',
        'lessons/02-more/01-c.md': file('c', 'More', 1),
        'lessons/01-basics/02-b.md': file('b', 'Basics', 2),
        'lessons/01-basics/01-a.md': file('a', 'Basics', 1),
        'problems/01-warm/01-p.md': file('p', 'Warm-up', 1, 'difficulty: Easy\n'),
      },
    });
    expect(lab.lessons.map((c) => [c.title, c.items.map((i) => i.id)])).toEqual([
      ['Basics', ['a', 'b']],
      ['More', ['c']],
    ]);
    expect(lab.problems[0]!.items[0]!.difficulty).toBe('Easy');
    expect(lab.datasets).toEqual({ tiny: 'CREATE TABLE t (n int);' });
    expect(lab.errors).toEqual([]);
  });

  it('reports duplicate ids, unknown chapters, missing datasets and broken files', () => {
    const lab = buildLab({
      labJson,
      files: {
        'datasets/tiny.sql': '',
        'lessons/01/01.md': file('a', 'Basics', 1),
        'lessons/01/02.md': file('a', 'Basics', 2),
        'lessons/01/03.md': file('z', 'Nowhere', 1),
        'lessons/01/04.md': file('m', 'Basics', 4).replace('dataset: tiny', 'dataset: nope'),
        'lessons/01/05.md': 'no front matter',
      },
    });
    const messages = lab.errors.map((e) => `${e.path}: ${e.message}`);
    expect(messages).toEqual([
      'lessons/01/02.md: Duplicate id "a" (also used in lessons/01/01.md)',
      'lessons/01/03.md: Chapter "Nowhere" is not listed in lab.json',
      'lessons/01/04.md: Dataset "nope" not found in datasets/',
      'lessons/01/05.md: Missing front-matter block (--- … ---) at the top of the file',
    ]);
    expect(lab.lessons[0]!.items.map((i) => i.id)).toEqual(['a']);
  });

  it('throws on an invalid lab.json', () => {
    expect(() => buildLab({ labJson: '{"id":"x"}', files: {} })).toThrow();
  });
});
````

- [ ] **Step 7: Run to verify it fails**

Run: `npx vitest run packages/content-loader/src/buildLab.test.ts`
Expected: FAIL — cannot resolve `./buildLab`.

- [ ] **Step 8: Implement buildLab, the Node reader and the index**

`packages/content-loader/src/buildLab.ts`:
```ts
import type { Chapter, ContentError, ItemKind, Lab, LessonItem } from '@codeadda/core';
import { isContentError, parseItem } from './parseItem';
import { labJson as labJsonSchema } from './schema';

export interface LabSource {
  labJson: string;
  files: Record<string, string>;
}

const DATASET = /^datasets\/([^/]+)\.(sql|json|redis)$/;

export function buildLab(src: LabSource): Lab {
  const meta = labJsonSchema.parse(JSON.parse(src.labJson));
  const errors: ContentError[] = [];
  const datasets: Record<string, string> = {};
  const parsed: LessonItem[] = [];

  const paths = Object.keys(src.files).sort();
  for (const path of paths) {
    const d = DATASET.exec(path);
    if (d) datasets[d[1]!] = src.files[path]!;
  }

  const seen = new Map<string, string>();
  for (const path of paths) {
    if (!path.endsWith('.md')) continue;
    const kind: ItemKind | null = path.startsWith('lessons/') ? 'lesson' : path.startsWith('problems/') ? 'problem' : null;
    if (!kind) continue;
    const r = parseItem(path, src.files[path]!, kind);
    if (isContentError(r)) { errors.push(r); continue; }
    const other = seen.get(r.id);
    if (other) { errors.push({ path, message: `Duplicate id "${r.id}" (also used in ${other})` }); continue; }
    const chapters = kind === 'lesson' ? meta.chapters : meta.problemGroups;
    if (!chapters.includes(r.chapter)) { errors.push({ path, message: `Chapter "${r.chapter}" is not listed in lab.json` }); continue; }
    if (r.dataset && !r.setup && datasets[r.dataset] === undefined) {
      errors.push({ path, message: `Dataset "${r.dataset}" not found in datasets/` });
      continue;
    }
    seen.set(r.id, path);
    parsed.push(r);
  }

  const group = (kind: ItemKind, titles: string[]): Chapter[] =>
    titles
      .map((title) => ({
        title,
        items: parsed
          .filter((i) => i.kind === kind && i.chapter === title)
          .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
      }))
      .filter((c) => c.items.length > 0);

  return {
    id: meta.id,
    title: meta.title,
    subtitle: meta.subtitle,
    language: meta.language,
    lessons: group('lesson', meta.chapters),
    problems: group('problem', meta.problemGroups),
    datasets,
    errors,
  };
}
```

`packages/content-loader/src/node.ts`:
```ts
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Lab } from '@codeadda/core';
import { buildLab, type LabSource } from './buildLab';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

export function readLabSource(dir: string): LabSource {
  const files: Record<string, string> = {};
  for (const full of walk(dir)) {
    const rel = relative(dir, full).split(sep).join('/');
    if (rel !== 'lab.json') files[rel] = readFileSync(full, 'utf8');
  }
  return { labJson: readFileSync(join(dir, 'lab.json'), 'utf8'), files };
}

export function loadLabFromDir(dir: string): Lab {
  return buildLab(readLabSource(dir));
}

export function listLabDirs(contentRoot: string): string[] {
  return readdirSync(contentRoot)
    .map((name) => join(contentRoot, name))
    .filter((d) => statSync(d).isDirectory() && existsSync(join(d, 'lab.json')));
}
```

`packages/content-loader/src/index.ts`:
```ts
export { splitFrontMatter } from './frontmatter';
export { splitSections, firstCodeBlock, parseHints } from './sections';
export { parseItem, isContentError } from './parseItem';
export { buildLab, type LabSource } from './buildLab';
```

- [ ] **Step 9: Run all loader tests and typecheck**

Run: `npx vitest run packages/content-loader && npm run typecheck`
Expected: PASS, no type errors.

---

### Task 4: PGlite engine

**Files:**
- Create: `packages/engine-pglite/package.json`, `src/PgliteEngine.ts`, `src/describe.ts`, `src/index.ts`
- Test: `packages/engine-pglite/src/PgliteEngine.test.ts`

**Interfaces:**
- Consumes: `Engine`, `Dataset`, `QueryResult`, `SchemaInfo` (Task 1).
- Produces: `class PgliteEngine implements Engine` (`kind = 'sql'`, `mode = 'browser'`; `run()` ignores `timeoutMs` — timeouts are handled by `WorkerEngine` in Task 7); `describeSchema(db: PGlite): Promise<SchemaInfo>`.

Behaviour to implement:
- `setup(dataset)` stores the dataset then calls `reset()`.
- `reset()` runs `ROLLBACK` (errors ignored), then `DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;`, then the dataset SQL.
- `run()` rejects an empty or comment-only query with `Please enter a SQL query.`; otherwise `db.exec(query, { rowMode: 'array' })` and returns the **last** result that has columns; if none, returns an empty success with notice `Query OK. N row(s) affected.`; errors return `{ ok: false, error: { message, position, code } }`.
- Type parsers keep DATE/TIME/TIMESTAMP/INTERVAL/NUMERIC as Postgres text; INT8 becomes a JS number when safe.

- [ ] **Step 1: Create the package and install PGlite**

`packages/engine-pglite/package.json`:
```json
{
  "name": "@codeadda/engine-pglite",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": { "@codeadda/core": "*" }
}
```

Run: `npm install @electric-sql/pglite@^0.3 -w @codeadda/engine-pglite`
Expected: dependency added.

- [ ] **Step 2: Write the failing engine tests**

`packages/engine-pglite/src/PgliteEngine.test.ts`:
```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { QueryResult, QuerySuccess } from '@codeadda/core';
import { PgliteEngine } from './PgliteEngine';

const dataset = {
  name: 'teams',
  source: `
    CREATE TABLE teams (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
    COMMENT ON TABLE teams IS 'Teams in the league';
    CREATE TABLE players (
      id SERIAL PRIMARY KEY,
      team_id INTEGER REFERENCES teams(id),
      name TEXT,
      joined DATE,
      salary NUMERIC(10,2)
    );
    INSERT INTO teams (name) VALUES ('Red'), ('Blue');
    INSERT INTO players (team_id, name, joined, salary) VALUES
      (1, 'Ana', '2024-01-05', 95000.00),
      (2, 'Ben', '2023-12-31', 70000.50),
      (NULL, 'Cy', NULL, NULL);
  `,
};

function success(r: QueryResult): QuerySuccess {
  if (!r.ok) throw new Error(`expected success, got: ${r.error.message}`);
  return r;
}

describe('PgliteEngine', () => {
  const engine = new PgliteEngine();
  beforeAll(async () => { await engine.setup(dataset); });
  beforeEach(async () => { await engine.reset(); });
  afterAll(async () => { await engine.dispose(); });

  it('returns columns and array rows', async () => {
    const r = success(await engine.run('SELECT id, name FROM teams ORDER BY id'));
    expect(r.columns).toEqual(['id', 'name']);
    expect(r.rows).toEqual([[1, 'Red'], [2, 'Blue']]);
    expect(r.rowCount).toBe(2);
  });

  it('keeps duplicate column names', async () => {
    const r = success(await engine.run('SELECT p.id, t.id FROM players p JOIN teams t ON t.id = p.team_id ORDER BY p.id'));
    expect(r.columns).toEqual(['id', 'id']);
    expect(r.rows).toEqual([[1, 1], [2, 2]]);
  });

  it('returns DATE and NUMERIC as Postgres text and COUNT as a number', async () => {
    const r = success(await engine.run("SELECT joined, salary FROM players WHERE name = 'Ana'"));
    expect(r.rows).toEqual([['2024-01-05', '95000.00']]);
    const c = success(await engine.run('SELECT count(*) AS n FROM players'));
    expect(c.rows).toEqual([[3]]);
  });

  it('returns the last result of a multi-statement query', async () => {
    const r = success(await engine.run("INSERT INTO teams (name) VALUES ('Green'); SELECT name FROM teams ORDER BY id;"));
    expect(r.rows).toEqual([['Red'], ['Blue'], ['Green']]);
  });

  it('reports affected rows for statements without results', async () => {
    const r = success(await engine.run('UPDATE players SET salary = 1 WHERE team_id = 1'));
    expect(r.columns).toEqual([]);
    expect(r.notice).toBe('Query OK. 1 row(s) affected.');
  });

  it('returns errors with message and position', async () => {
    const r = await engine.run('SELECT * FORM teams');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toMatch(/syntax error/);
    expect(r.error.position).toBeGreaterThan(0);
  });

  it('rejects empty and comment-only queries', async () => {
    for (const q of ['', '   ', '-- just a comment\n', '/* note */']) {
      expect(await engine.run(q)).toEqual({ ok: false, error: { message: 'Please enter a SQL query.' } });
    }
  });

  it('reset restores the dataset after DROP TABLE', async () => {
    success(await engine.run('DROP TABLE players'));
    await engine.reset();
    expect(success(await engine.run('SELECT count(*) FROM players')).rows).toEqual([[3]]);
  });

  it('recovers from an open, aborted transaction on reset', async () => {
    await engine.run('BEGIN');
    await engine.run('SELECT 1/0');
    await engine.reset();
    expect(success(await engine.run('SELECT count(*) FROM teams')).rows).toEqual([[2]]);
  });

  it('describes tables, keys, comments, row counts and relationships', async () => {
    const s = await engine.describe();
    expect(s.tables.map((t) => t.name)).toEqual(['teams', 'players']);
    const teams = s.tables[0]!;
    expect(teams).toMatchObject({ description: 'Teams in the league', rowCount: 2, sampleQuery: 'SELECT * FROM teams LIMIT 5;' });
    const players = s.tables[1]!;
    expect(players.columns.find((c) => c.name === 'id')).toMatchObject({ isPrimary: true, nullable: false });
    expect(players.columns.find((c) => c.name === 'team_id')).toMatchObject({ isForeign: true, references: 'teams(id)' });
    expect(players.columns.find((c) => c.name === 'salary')?.type).toBe('numeric(10,2)');
    expect(s.relationships).toEqual([{ from: 'players', column: 'team_id', to: 'teams', toColumn: 'id' }]);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run packages/engine-pglite`
Expected: FAIL — cannot resolve `./PgliteEngine`.

- [ ] **Step 4: Implement the engine**

`packages/engine-pglite/src/describe.ts`:
```ts
import type { PGlite } from '@electric-sql/pglite';
import type { ColumnInfo, Relationship, SchemaInfo, TableInfo } from '@codeadda/core';

const TABLES_SQL = `
  SELECT c.relname AS name, obj_description(c.oid, 'pg_class') AS description
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY c.oid`;

const COLUMNS_SQL = `
  SELECT c.relname AS table_name, a.attname AS name,
         format_type(a.atttypid, a.atttypmod) AS type, NOT a.attnotnull AS nullable
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
  ORDER BY c.relname, a.attnum`;

const KEYS_SQL = `
  SELECT con.contype AS kind, c.relname AS table_name, a.attname AS column_name,
         fc.relname AS ref_table, fa.attname AS ref_column
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
  JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum
  LEFT JOIN pg_class fc ON fc.oid = con.confrelid
  LEFT JOIN pg_attribute fa ON fa.attrelid = con.confrelid AND fa.attnum = con.confkey[k.ord]
  WHERE n.nspname = 'public' AND con.contype IN ('p', 'f')`;

interface KeyRow { kind: string; table_name: string; column_name: string; ref_table: string | null; ref_column: string | null }

export function quoteIdent(name: string): string {
  return /^[a-z_][a-z0-9_]*$/.test(name) ? name : `"${name.replace(/"/g, '""')}"`;
}

export async function describeSchema(db: PGlite): Promise<SchemaInfo> {
  const tables = (await db.query<{ name: string; description: string | null }>(TABLES_SQL)).rows;
  const columns = (await db.query<{ table_name: string; name: string; type: string; nullable: boolean }>(COLUMNS_SQL)).rows;
  const keys = (await db.query<KeyRow>(KEYS_SQL)).rows;

  const result: TableInfo[] = [];
  for (const t of tables) {
    const count = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${quoteIdent(t.name)}`);
    const cols: ColumnInfo[] = columns
      .filter((c) => c.table_name === t.name)
      .map((c) => {
        const fk = keys.find((k) => k.kind === 'f' && k.table_name === t.name && k.column_name === c.name);
        return {
          name: c.name,
          type: c.type,
          nullable: c.nullable,
          isPrimary: keys.some((k) => k.kind === 'p' && k.table_name === t.name && k.column_name === c.name),
          isForeign: !!fk,
          references: fk ? `${fk.ref_table}(${fk.ref_column})` : undefined,
        };
      });
    result.push({
      name: t.name,
      description: t.description ?? undefined,
      rowCount: count.rows[0]?.n ?? 0,
      columns: cols,
      sampleQuery: `SELECT * FROM ${quoteIdent(t.name)} LIMIT 5;`,
    });
  }

  const relationships: Relationship[] = keys
    .filter((k) => k.kind === 'f')
    .map((k) => ({ from: k.table_name, column: k.column_name, to: k.ref_table ?? '', toColumn: k.ref_column ?? '' }));

  return { tables: result, relationships };
}
```

`packages/engine-pglite/src/PgliteEngine.ts`:
```ts
import { PGlite, type Results } from '@electric-sql/pglite';
import type { Dataset, Engine, QueryResult, SchemaInfo } from '@codeadda/core';
import { describeSchema } from './describe';

const asText = (v: string) => v;
// Postgres type OIDs: keep dates/times/numeric as the text Postgres prints; INT8 → number when safe.
const PARSERS = {
  1082: asText, // date
  1083: asText, // time
  1114: asText, // timestamp
  1184: asText, // timestamptz
  1186: asText, // interval
  1700: asText, // numeric
  20: (v: string) => {
    const n = Number(v);
    return Number.isSafeInteger(n) ? n : v;
  },
};

function stripSqlComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

export class PgliteEngine implements Engine {
  readonly kind = 'sql' as const;
  readonly mode = 'browser' as const;
  private db?: Promise<PGlite>;
  private dataset?: Dataset;

  private getDb(): Promise<PGlite> {
    this.db ??= PGlite.create({ parsers: PARSERS });
    return this.db;
  }

  async setup(dataset: Dataset): Promise<void> {
    this.dataset = dataset;
    await this.reset();
  }

  async reset(): Promise<void> {
    const db = await this.getDb();
    try {
      await db.exec('ROLLBACK');
    } catch {
      // no open transaction
    }
    await db.exec('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
    if (this.dataset?.source.trim()) await db.exec(this.dataset.source);
  }

  async run(query: string): Promise<QueryResult> {
    if (!stripSqlComments(query).trim()) return { ok: false, error: { message: 'Please enter a SQL query.' } };
    const db = await this.getDb();
    const started = performance.now();
    try {
      const results = await db.exec(query, { rowMode: 'array' });
      return toSuccess(results, Math.round(performance.now() - started));
    } catch (e) {
      return toFailure(e);
    }
  }

  snapshot(query: string): Promise<QueryResult> {
    return this.run(query);
  }

  async describe(): Promise<SchemaInfo> {
    return describeSchema(await this.getDb());
  }

  async dispose(): Promise<void> {
    if (!this.db) return;
    const db = await this.db;
    this.db = undefined;
    await db.close();
  }
}

function toSuccess(results: Results[], durationMs: number): QueryResult {
  const last = [...results].reverse().find((r) => r.fields.length > 0);
  if (last) {
    return {
      ok: true,
      columns: last.fields.map((f) => f.name),
      rows: last.rows as unknown[][],
      rowCount: last.rows.length,
      durationMs,
    };
  }
  const affected = results.reduce((n, r) => n + (r.affectedRows ?? 0), 0);
  return { ok: true, columns: [], rows: [], rowCount: 0, durationMs, notice: `Query OK. ${affected} row(s) affected.` };
}

function toFailure(e: unknown): QueryResult {
  const err = e as { message?: string; position?: string | number; code?: string };
  const position = err.position !== undefined ? Number(err.position) : undefined;
  return {
    ok: false,
    error: {
      message: err.message ?? String(e),
      ...(position !== undefined && Number.isFinite(position) ? { position } : {}),
      ...(err.code ? { code: err.code } : {}),
    },
  };
}
```

`packages/engine-pglite/src/index.ts`:
```ts
export { PgliteEngine } from './PgliteEngine';
export { describeSchema, quoteIdent } from './describe';
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run packages/engine-pglite`
Expected: PASS. If `rowMode: 'array'` is not honoured by `exec` in the installed PGlite version (the duplicate-columns test would fail with object rows), check `node_modules/@electric-sql/pglite/dist/*.d.ts` for the `exec` signature and pass the option the way that version expects; do not work around it by converting object rows (that loses duplicate columns).

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

---

### Task 5: SQL lab dataset, first chapter and `check-content`

**Files:**
- Create: `content/sql/lab.json`, `content/sql/datasets/shop.sql`
- Create: `content/sql/lessons/01-querying/01-select-all.md` … `05-aliases.md`
- Create: `scripts/checkLab.ts`, `scripts/check-content.ts`
- Test: `scripts/checkLab.test.ts`

**Interfaces:**
- Consumes: `grade`, `resolveDataset` (Task 2); `buildLab`, `loadLabFromDir`, `listLabDirs` (Task 3); `PgliteEngine` (Task 4).
- Produces: `checkLab(lab: Lab, engine: Engine): Promise<{ checked: number; failures: ContentError[] }>`; `npm run check-content` (exit code 1 on any failure); the `shop` dataset every SQL lesson uses.

- [ ] **Step 1: Create `lab.json`**

`content/sql/lab.json`:
```json
{
  "id": "sql",
  "title": "SQL Lab",
  "subtitle": "Learn SQL one query at a time",
  "language": "sql",
  "chapters": [
    "Querying Data",
    "Sorting Data",
    "Filtering Data",
    "Joining Tables",
    "Grouping Data",
    "Subqueries",
    "Set Operators",
    "Modifying Data",
    "Common Table Expressions",
    "Advanced Queries",
    "Data Types & Constraints"
  ],
  "problemGroups": ["Basics", "Joins", "Aggregation", "Advanced"]
}
```

- [ ] **Step 2: Create the `shop` dataset**

Rows are inserted **without ids** so `SERIAL` sequences stay correct for later `INSERT` lessons; ids are 1…n in the order shown.

`content/sql/datasets/shop.sql`:
```sql
-- Shop dataset for the SQL lab. Original data.

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  age INTEGER,
  country VARCHAR(50),
  city VARCHAR(50),
  signup_date DATE NOT NULL
);
COMMENT ON TABLE users IS 'Customers who shop in the store';

CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  location VARCHAR(60)
);
COMMENT ON TABLE departments IS 'Company departments';

CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  department_id INTEGER REFERENCES departments(id),
  manager_id INTEGER REFERENCES employees(id),
  salary NUMERIC(10,2) NOT NULL,
  hire_date DATE NOT NULL
);
COMMENT ON TABLE employees IS 'Staff, with the manager each person reports to';

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT
);
COMMENT ON TABLE categories IS 'Product categories';

CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  country VARCHAR(50),
  contact_email VARCHAR(100)
);
COMMENT ON TABLE suppliers IS 'Companies that supply products';

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES categories(id),
  supplier_id INTEGER REFERENCES suppliers(id),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0
);
COMMENT ON TABLE products IS 'Products for sale, with price and stock';

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  order_date DATE NOT NULL,
  status VARCHAR(20)
);
COMMENT ON TABLE orders IS 'Orders: one product per order; status can be NULL';

CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  review_date DATE NOT NULL
);
COMMENT ON TABLE reviews IS 'Product reviews written by customers';

INSERT INTO users (name, email, phone, age, country, city, signup_date) VALUES
  ('Aarav Mehta',  'aarav@example.com',  '555-1001', 29, 'India',   'Mumbai',  '2023-01-12'),
  ('Sofia Rossi',  'sofia@example.com',  NULL,       34, 'Italy',   'Milan',   '2023-02-03'),
  ('Liam Carter',  'liam@example.com',   '555-1003', 41, 'USA',     'Denver',  '2023-02-18'),
  ('Mei Tanaka',   'mei@example.com',    '555-1004', 26, 'Japan',   'Osaka',   '2023-03-07'),
  ('Noah Fischer', 'noah@example.com',   NULL,       38, 'Germany', 'Berlin',  '2023-03-22'),
  ('Priya Nair',   'priya@example.com',  '555-1006', 31, 'India',   'Kochi',   '2023-04-09'),
  ('Ethan Brooks', 'ethan@example.com',  '555-1007', 45, 'USA',     'Austin',  '2023-04-30'),
  ('Chloe Martin', 'chloe@example.com',  '555-1008', 23, 'France',  'Lyon',    '2023-05-14'),
  ('Lucas Silva',  'lucas@example.com',  NULL,       36, 'Brazil',  'Recife',  '2023-06-01'),
  ('Hana Kim',     'hana@example.com',   '555-1010', 28, 'Japan',   'Tokyo',   '2023-06-19'),
  ('Omar Haddad',  'omar@example.com',   '555-1011', 52, 'UAE',     'Dubai',   '2023-07-08'),
  ('Isla Murphy',  'isla@example.com',   '555-1012', 33, 'Ireland', 'Cork',    '2023-08-15'),
  ('Rohan Gupta',  'rohan@example.com',  NULL,       27, 'India',   'Pune',    '2023-09-02'),
  ('Ava Thompson', 'ava@example.com',    '555-1014', 39, 'USA',     'Seattle', '2023-10-21'),
  ('Mateo Lopez',  'mateo@example.com',  '555-1015', 30, 'Spain',   'Seville', '2023-11-11');

INSERT INTO departments (name, location) VALUES
  ('Engineering', 'Bengaluru'),
  ('Sales',       'Mumbai'),
  ('Marketing',   'Delhi'),
  ('Support',     'Pune'),
  ('Finance',     'Mumbai'),
  ('Research',    'Hyderabad');

INSERT INTO employees (name, email, department_id, manager_id, salary, hire_date) VALUES
  ('Kavya Rao',    'kavya@shop.dev',  1,    NULL, 150000.00, '2019-04-01'),
  ('Arjun Das',    'arjun@shop.dev',  2,    NULL, 120000.00, '2020-01-15'),
  ('Neha Iyer',    'neha@shop.dev',   1,    1,     98000.00, '2021-06-10'),
  ('Vikram Singh', 'vikram@shop.dev', 1,    1,     91000.00, '2022-02-01'),
  ('Sara Khan',    'sara@shop.dev',   2,    2,     72000.00, '2021-09-20'),
  ('Dev Patel',    'dev@shop.dev',    3,    NULL,  88000.00, '2020-11-05'),
  ('Meera Joshi',  'meera@shop.dev',  4,    2,     54000.00, '2023-03-13'),
  ('Kabir Shah',   'kabir@shop.dev',  4,    7,     48000.00, '2023-08-01'),
  ('Tara Menon',   'tara@shop.dev',   5,    NULL, 105000.00, '2019-12-02'),
  ('Ishaan Bose',  'ishaan@shop.dev', NULL, 1,     60000.00, '2024-01-08');

INSERT INTO categories (name, description) VALUES
  ('Electronics',    'Gadgets and devices'),
  ('Books',          'Printed and hardcover books'),
  ('Home & Kitchen', 'Cookware and home goods'),
  ('Sports',         'Gear for staying active'),
  ('Toys',           'Games and toys for all ages'),
  ('Garden',         'Plants, tools and outdoor living');

INSERT INTO suppliers (name, country, contact_email) VALUES
  ('Nimbus Traders', 'India',   'sales@nimbus.example'),
  ('Northwind Goods', 'USA',    'hello@northwind.example'),
  ('Sakura Supply',  'Japan',   'info@sakura.example'),
  ('Rhein Handel',   'Germany', 'kontakt@rhein.example'),
  ('Andes Imports',  'Chile',   NULL);

INSERT INTO products (name, description, category_id, supplier_id, price, stock) VALUES
  ('Wireless Earbuds',    'Bluetooth 5.3 earbuds',   1, 3,  59.99, 120),
  ('Mechanical Keyboard', 'Hot-swappable switches',  1, 3,  89.50,  45),
  ('USB-C Hub',           NULL,                      1, 2,  34.00, 200),
  ('4K Monitor',          '27-inch IPS display',     1, 2, 329.00,  15),
  ('Smart Watch',         NULL,                      1, 1, 149.00,   0),
  ('The Pragmatic Coder', 'Paperback',               2, 2,  39.95,  60),
  ('Data at Scale',       'Hardcover',               2, 2,  54.00,  25),
  ('SQL in Practice',     NULL,                      2, 1,  29.00,  80),
  ('Chef''s Knife',       'Stainless steel, 8-inch', 3, 4,  45.00,  35),
  ('Cast Iron Pan',       NULL,                      3, 4,  38.50,  50),
  ('French Press',        '1 litre',                 3, 4,  24.99,   0),
  ('Yoga Mat',            'Non-slip, 6mm',           4, 1,  22.00, 150),
  ('Running Shoes',       NULL,                      4, 5,  95.00,  40),
  ('Tennis Racket',       'Graphite frame',          4, 5, 120.00,  12),
  ('Football',            NULL,                      4, 1,  18.00,  90),
  ('Building Blocks Set', '500 pieces',              5, 3,  49.99,  30),
  ('Puzzle 1000',         NULL,                      5, 2,  15.50,  70),
  ('Board Game Night',    'For 2 to 6 players',      5, 2,  34.99,  22),
  ('Desk Lamp',           'LED, dimmable',           3, 1,  27.00,  65),
  ('Portable Speaker',    NULL,                      1, 3,  79.00,   8);

INSERT INTO orders (user_id, product_id, quantity, order_date, status) VALUES
  (1,  1,  2, '2024-01-05', 'delivered'),
  (1,  6,  1, '2024-01-05', 'delivered'),
  (2,  2,  1, '2024-01-09', 'delivered'),
  (3,  4,  1, '2024-01-14', 'shipped'),
  (4,  12, 3, '2024-01-20', 'delivered'),
  (5,  9,  1, '2024-01-22', 'delivered'),
  (6,  8,  2, '2024-02-02', 'delivered'),
  (7,  13, 1, '2024-02-06', 'shipped'),
  (8,  16, 1, '2024-02-11', 'pending'),
  (9,  3,  4, '2024-02-15', 'delivered'),
  (10, 1,  1, '2024-02-20', NULL),
  (11, 4,  2, '2024-02-25', 'delivered'),
  (13, 15, 2, '2024-03-01', 'pending'),
  (14, 7,  1, '2024-03-04', 'shipped'),
  (3,  19, 2, '2024-03-09', 'delivered'),
  (1,  20, 1, '2024-03-12', 'pending'),
  (6,  6,  1, '2024-03-18', 'delivered'),
  (2,  10, 1, '2024-03-21', NULL),
  (4,  18, 1, '2024-03-27', 'shipped'),
  (7,  2,  2, '2024-04-02', 'delivered'),
  (9,  12, 1, '2024-04-06', 'pending'),
  (10, 16, 2, '2024-04-10', 'delivered'),
  (11, 13, 1, '2024-04-15', 'shipped'),
  (13, 8,  3, '2024-04-19', 'delivered'),
  (14, 1,  1, '2024-04-23', 'delivered');

INSERT INTO reviews (product_id, user_id, rating, comment, review_date) VALUES
  (1,  1,  5, 'Great sound for the price',    '2024-01-15'),
  (2,  2,  4, 'Clicky and solid',             '2024-01-20'),
  (4,  3,  5, 'Crisp picture',                '2024-01-25'),
  (12, 4,  4, NULL,                           '2024-01-30'),
  (9,  5,  5, 'Very sharp',                   '2024-02-01'),
  (8,  6,  3, 'Good examples, dry in places', '2024-02-12'),
  (13, 7,  4, 'Comfortable on long runs',     '2024-02-18'),
  (16, 8,  5, 'Kids love it',                 '2024-02-25'),
  (1,  10, 3, 'Battery could be better',      '2024-03-01'),
  (4,  11, 4, NULL,                           '2024-03-06'),
  (7,  14, 5, 'A must-read for engineers',    '2024-03-14'),
  (2,  7,  2, 'Too loud for the office',      '2024-04-10');
```

- [ ] **Step 3: Write chapter 1 ("Querying Data")**

These five files are also the **model** for every later lesson (tone, length, structure).

`content/sql/lessons/01-querying/01-select-all.md`:
````markdown
---
id: select-all
title: Selecting Every Column
chapter: Querying Data
order: 1
dataset: shop
check: rows-unordered
---

Every query starts with `SELECT`. It says which **columns** you want, and `FROM` says which
**table** to read them from.

The shortcut `*` means "every column". `SELECT * FROM departments` returns the whole
`departments` table — every row, every column.

`*` is handy while you explore a table you don't know yet. In real code, name the columns you
need instead (next lesson): the query keeps working when someone adds a column later.

## Task
Return every column and every row from the `users` table.

## Hint
- The pattern is `SELECT * FROM table_name;`

## Solution
```sql
SELECT * FROM users;
```
````

`content/sql/lessons/01-querying/02-select-columns.md`:
````markdown
---
id: select-columns
title: Choosing Columns
chapter: Querying Data
order: 2
dataset: shop
check: rows-unordered
---

Instead of `*`, list the columns you want, separated by commas. The result has exactly those
columns, in the order you wrote them.

```sql
SELECT name, location FROM departments;
```

Choosing columns never removes rows — every row is still returned. Picking *rows* is the job of
`WHERE`, which comes a little later.

## Task
Return the `name` and `email` of every user, in that column order.

## Hint
- Separate column names with commas: `SELECT col1, col2 FROM table_name;`

## Solution
```sql
SELECT name, email FROM users;
```
````

`content/sql/lessons/01-querying/03-distinct.md`:
````markdown
---
id: distinct
title: Removing Duplicates with DISTINCT
chapter: Querying Data
order: 3
dataset: shop
check: rows-unordered
---

Many users live in the same country, so `SELECT country FROM users` repeats values.
`SELECT DISTINCT` keeps one copy of each different row.

```sql
SELECT DISTINCT location FROM departments;
```

With several columns, `DISTINCT` removes rows where *all* the listed columns are the same.

## Task
Return each country that appears in `users`, once.

## Hint
- Put `DISTINCT` right after `SELECT`.

## Solution
```sql
SELECT DISTINCT country FROM users;
```
````

`content/sql/lessons/01-querying/04-limit.md`:
````markdown
---
id: limit
title: Limiting Rows with LIMIT
chapter: Querying Data
order: 4
dataset: shop
check: rows-ordered
---

`LIMIT n` stops after `n` rows. It is useful for peeking at a big table, or for "top 5"
questions.

Without `ORDER BY`, the database may return rows in any order, so "the first 5 rows" is not
well defined. Pair `LIMIT` with `ORDER BY` whenever the choice of rows matters:

```sql
SELECT * FROM categories ORDER BY id LIMIT 3;
```

## Task
Return all columns of the 5 products with the lowest `id`, lowest first.

## Hint
- Sort with `ORDER BY id`, then add `LIMIT 5`.

## Solution
```sql
SELECT * FROM products ORDER BY id LIMIT 5;
```
````

`content/sql/lessons/01-querying/05-aliases.md`:
````markdown
---
id: aliases
title: Renaming Columns with AS
chapter: Querying Data
order: 5
dataset: shop
check: rows-unordered
---

`AS` gives a column a new name in the result. The table itself is not changed.

```sql
SELECT name AS department, location AS city FROM departments;
```

Aliases make results easier to read and are required when a column is calculated, such as
`price * 2 AS double_price`.

## Task
Return every product's `name` as `product_name` and its `price` as `unit_price`.

## Hint
- Write `column AS new_name` for each column.

## Solution
```sql
SELECT name AS product_name, price AS unit_price FROM products;
```
````

- [ ] **Step 4: Write the failing checkLab test**

`scripts/checkLab.test.ts`:
````ts
import { afterAll, describe, expect, it } from 'vitest';
import { buildLab } from '@codeadda/content-loader';
import { PgliteEngine } from '@codeadda/engine-pglite';
import { checkLab } from './checkLab';

const labJson = JSON.stringify({ id: 't', title: 'T', subtitle: '', language: 'sql', chapters: ['A'] });
const lesson = (id: string, order: number, solution: string, extra = '') => `---
id: ${id}
title: ${id}
chapter: A
order: ${order}
dataset: tiny
${extra}---

## Task
Do it.

## Solution
\`\`\`sql
${solution}
\`\`\`
`;

describe('checkLab', () => {
  const engine = new PgliteEngine();
  afterAll(() => engine.dispose());

  it('passes good lessons and reports broken, empty and invalid ones', async () => {
    const lab = buildLab({
      labJson,
      files: {
        'datasets/tiny.sql': 'CREATE TABLE t (n int); INSERT INTO t VALUES (1), (2);',
        'lessons/a/1.md': lesson('good', 1, 'SELECT n FROM t;'),
        'lessons/a/2.md': lesson('broken', 2, 'SELECT nope FROM t;'),
        'lessons/a/3.md': lesson('empty', 3, 'SELECT n FROM t WHERE n > 5;'),
        'lessons/a/4.md': lesson('state-ok', 4, 'INSERT INTO t VALUES (3);', 'check: state\ncheckQuery: SELECT n FROM t ORDER BY n\n'),
        'lessons/a/5.md': 'not a lesson',
      },
    });
    const { checked, failures } = await checkLab(lab, engine);
    expect(checked).toBe(4);
    expect(failures.map((f) => f.path)).toEqual(['lessons/a/5.md', 'lessons/a/2.md', 'lessons/a/3.md']);
    expect(failures[1]!.message).toMatch(/^Solution failed: .*nope/);
    expect(failures[2]!.message).toMatch(/returns no rows/);
  });
});
````

- [ ] **Step 5: Run to verify it fails**

Run: `npx vitest run scripts`
Expected: FAIL — cannot resolve `./checkLab`.

- [ ] **Step 6: Implement checkLab and the CLI**

`scripts/checkLab.ts`:
```ts
import { grade, resolveDataset, type ContentError, type Engine, type Lab } from '@codeadda/core';

export async function checkLab(lab: Lab, engine: Engine): Promise<{ checked: number; failures: ContentError[] }> {
  const failures: ContentError[] = [...lab.errors];
  const items = [...lab.lessons, ...lab.problems].flatMap((c) => c.items);
  for (const item of items) {
    try {
      // Grading the solution against itself: it can only fail if the solution (or check query) errors.
      const result = await grade(engine, item, resolveDataset(lab, item), item.solution);
      if (!result.pass) {
        const message = result.expected ? result.reason : `Solution failed: ${result.reason.replace(/^Your query failed: /, '')}`;
        failures.push({ path: item.path, message });
      } else if (item.check.startsWith('rows') && result.expected && result.expected.rowCount === 0) {
        failures.push({ path: item.path, message: 'Solution returns no rows — check the task or the dataset' });
      }
    } catch (e) {
      failures.push({ path: item.path, message: e instanceof Error ? e.message : String(e) });
    }
  }
  return { checked: items.length, failures };
}
```

`scripts/check-content.ts`:
```ts
import { resolve } from 'node:path';
import { listLabDirs, loadLabFromDir } from '@codeadda/content-loader/node';
import { PgliteEngine } from '@codeadda/engine-pglite';
import { checkLab } from './checkLab';

const contentRoot = resolve(import.meta.dirname, '../content');
let failed = 0;

for (const dir of listLabDirs(contentRoot)) {
  let lab;
  try {
    lab = loadLabFromDir(dir);
  } catch (e) {
    console.error(`✗ ${dir}/lab.json is invalid: ${e instanceof Error ? e.message : e}`);
    failed++;
    continue;
  }
  if (lab.language !== 'sql') {
    console.log(`- ${lab.id}: skipped (no ${lab.language} engine yet)`);
    continue;
  }
  const engine = new PgliteEngine();
  const { checked, failures } = await checkLab(lab, engine);
  await engine.dispose();
  for (const f of failures) console.error(`✗ content/${lab.id}/${f.path} — ${f.message}`);
  console.log(`${failures.length ? '✗' : '✓'} ${lab.id}: ${checked} item(s) checked, ${failures.length} problem(s)`);
  failed += failures.length;
}

process.exitCode = failed ? 1 : 0;
```

- [ ] **Step 7: Run the test, then the real content check**

Run: `npx vitest run scripts`
Expected: PASS.

Run: `npm run check-content`
Expected: `✓ sql: 5 item(s) checked, 0 problem(s)` and exit code 0.

---

### Task 6: Web app scaffold — Vite, Tailwind tokens, preferences, navbar, content registry

**Files:**
- Create: `apps/web/package.json`, `apps/web/vite.config.ts`, `apps/web/index.html`, `apps/web/src/vite-env.d.ts`, `apps/web/src/main.tsx`, `apps/web/src/App.tsx`
- Create: `apps/web/src/styles/tokens.css`, `apps/web/src/styles/app.css`, `apps/web/src/lib/cx.ts`
- Create: `apps/web/src/state/storage.ts`, `apps/web/src/state/prefs.ts`
- Create: `apps/web/src/content/registry.ts`
- Create: `apps/web/src/components/Navbar.tsx`, `ThemeToggle.tsx`, `NotFound.tsx`, `apps/web/src/lab/LabRoute.tsx` (placeholder, replaced in Task 9)
- Create: `vitest.setup.ts`; Modify: `vitest.config.ts`
- Test: `apps/web/src/state/prefs.test.ts`, `apps/web/src/content/registry.test.ts`

**Interfaces:**
- Consumes: `buildLab` (Task 3), `Lab` (Task 1), content from Task 5.
- Produces: `cx(...c: (string | false | null | undefined)[]): string`; `interface KeyValue { get(key: string): string | null; set(key: string, value: string): void }`, `safeLocalStorage(): KeyValue`, `memoryStorage(): KeyValue`; `type Theme = 'light' | 'dark'`, `FONT_SCALES = [0.9, 1, 1.1, 1.25]`, `interface Prefs { theme: Theme; fontScale: number; sidebarCollapsed: boolean }`, `createPrefsStore(kv: KeyValue, systemDark: () => boolean)`, `prefsStore`, `usePrefs(): Prefs`, `applyPrefs(p: Prefs): void`; `buildRegistry(labJsons: Record<string,string>, files: Record<string,string>): Lab[]`, `labs: Lab[]`, `getLab(id: string): Lab | undefined`. **Tailwind colour keys** (use these in all later tasks): `page, surface, subtle, hover, inverse, on-inverse, ink, muted, faint, line, line-strong, hair, wash, wash-strong, backdrop, brand, brand-hover, brand-muted, brand-line, brand-glow, ok, ok-bg, ok-line, bad, bad-bg, bad-line, warn, warn-bg, warn-line, note, note-bg, note-line`; shadow keys `soft, raised, float, glow`; breakpoint `lab` (900px).

- [ ] **Step 1: Create the web package and install dependencies**

`apps/web/package.json`:
```json
{
  "name": "@codeadda/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@codeadda/core": "*",
    "@codeadda/content-loader": "*",
    "@codeadda/engine-pglite": "*"
  }
}
```

Run:
```bash
npm install react@^19 react-dom@^19 react-router@^7 @monaco-editor/react@^4.7 react-markdown@^10 remark-gfm@^4 @fontsource-variable/inter@^5 @fontsource-variable/jetbrains-mono@^5 -w @codeadda/web
npm install -D vite@^7 @vitejs/plugin-react@^5 tailwindcss@^4 @tailwindcss/vite@^4 @types/react@^19 @types/react-dom@^19 -w @codeadda/web
npm install -D jsdom@^26 @testing-library/react@^16 @testing-library/dom@^10 @testing-library/jest-dom@^6 @testing-library/user-event@^14
```
Expected: all installs succeed.

- [ ] **Step 2: Vite config, HTML and type references**

`apps/web/vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // PGlite ships its own WASM; pre-bundling breaks its asset URLs.
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
  worker: { format: 'es' },
  // content/ lives two levels above apps/web.
  server: { fs: { allow: ['../..'] } },
});
```

`apps/web/index.html`:
```html
<!doctype html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CodeAdda</title>
    <script>
      try {
        var p = JSON.parse(localStorage.getItem('codeadda:prefs') || '{}');
        var t = p.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.dataset.theme = t;
        if (p.fontScale) document.documentElement.style.setProperty('--font-scale', String(p.fontScale));
      } catch (e) {}
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`apps/web/src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

- [ ] **Step 3: Design tokens and Tailwind mapping**

`apps/web/src/styles/tokens.css` (values from spec §5.3):
```css
:root,
[data-theme='light'] {
  --color-bg-primary: #faf7f2;
  --color-bg-secondary: #ffffff;
  --color-bg-tertiary: #f3efe8;
  --color-bg-hover: #ece6dc;
  --color-bg-inverse: #1c1917;
  --color-text-inverse: #faf7f2;
  --color-text-primary: #1c1917;
  --color-text-secondary: #57534e;
  --color-text-muted: #a8a29e;
  --color-border: #e7e0d5;
  --color-border-hover: #d6cdbf;
  --color-hairline: rgba(28, 25, 23, 0.08);
  --color-overlay: rgba(28, 25, 23, 0.04);
  --color-overlay-strong: rgba(28, 25, 23, 0.08);
  --color-scrim: rgba(28, 25, 23, 0.45);
  --color-accent: #f97316;
  --color-accent-hover: #ea580c;
  --color-accent-muted: rgba(249, 115, 22, 0.1);
  --color-accent-border: rgba(249, 115, 22, 0.3);
  --color-accent-glow: rgba(249, 115, 22, 0.18);
  --color-success: #15803d;
  --color-success-bg: #dcfce7;
  --color-success-border: #bbf7d0;
  --color-error: #b91c1c;
  --color-error-bg: #fee2e2;
  --color-error-border: #fecaca;
  --color-warning: #a16207;
  --color-warning-bg: #fef3c7;
  --color-warning-border: #fde68a;
  --color-info: #1d4ed8;
  --color-info-bg: #dbeafe;
  --color-info-border: #bfdbfe;
  --shadow-sm: 0 1px 2px rgba(28, 25, 23, 0.05), 0 1px 3px rgba(28, 25, 23, 0.04);
  --shadow-md: 0 2px 4px rgba(28, 25, 23, 0.05), 0 8px 20px -6px rgba(28, 25, 23, 0.12);
  --shadow-lg: 0 4px 8px rgba(28, 25, 23, 0.06), 0 20px 40px -12px rgba(28, 25, 23, 0.2);
  --shadow-accent: 0 8px 24px -8px rgba(249, 115, 22, 0.45);
  color-scheme: light;
}

[data-theme='dark'] {
  --color-bg-primary: #111010;
  --color-bg-secondary: #181716;
  --color-bg-tertiary: #1f1d1b;
  --color-bg-hover: #272422;
  --color-bg-inverse: #f5f2ed;
  --color-text-inverse: #111010;
  --color-text-primary: #f5f2ed;
  --color-text-secondary: #a8a29e;
  --color-text-muted: #6b6560;
  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-hover: rgba(255, 255, 255, 0.14);
  --color-hairline: rgba(255, 255, 255, 0.06);
  --color-overlay: rgba(255, 255, 255, 0.04);
  --color-overlay-strong: rgba(255, 255, 255, 0.08);
  --color-scrim: rgba(0, 0, 0, 0.6);
  --color-accent: #fb923c;
  --color-accent-hover: #fdba74;
  --color-accent-muted: rgba(251, 146, 60, 0.12);
  --color-accent-border: rgba(251, 146, 60, 0.3);
  --color-accent-glow: rgba(251, 146, 60, 0.22);
  --color-success: #4ade80;
  --color-success-bg: rgba(74, 222, 128, 0.12);
  --color-success-border: rgba(74, 222, 128, 0.3);
  --color-error: #f87171;
  --color-error-bg: rgba(248, 113, 113, 0.12);
  --color-error-border: rgba(248, 113, 113, 0.3);
  --color-warning: #fbbf24;
  --color-warning-bg: rgba(251, 191, 36, 0.12);
  --color-warning-border: rgba(251, 191, 36, 0.3);
  --color-info: #60a5fa;
  --color-info-bg: rgba(96, 165, 250, 0.12);
  --color-info-border: rgba(96, 165, 250, 0.3);
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px -2px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 16px 40px -12px rgba(0, 0, 0, 0.6);
  --shadow-accent: 0 8px 24px -8px rgba(251, 146, 60, 0.35);
  color-scheme: dark;
}

:root {
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 0.75rem;
  --space-lg: 1rem;
  --space-xl: 1.5rem;
  --space-2xl: 2rem;
  --transition-fast: 0.15s ease;
  --transition-base: 0.2s ease;
  --transition-normal: 0.25s ease;
  --transition-slow: 0.3s ease;
  --navbar-height: 56px;
  --sidebar-width: 300px;
  --focus-ring: 0 0 0 3px var(--color-accent-glow);
  --z-navbar: 1000;
  --z-modal: 2000;
  --z-tooltip: 3000;
}
```

`apps/web/src/styles/app.css`:
```css
@import 'tailwindcss';
@import './tokens.css';

@theme {
  --font-sans: 'Inter Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-mono: 'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
  --text-xs: 0.6875rem;
  --text-sm: 0.8125rem;
  --text-base: 0.875rem;
  --text-md: 0.9375rem;
  --text-lg: 1rem;
  --text-xl: 1.125rem;
  --text-2xl: 1.25rem;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --breakpoint-lab: 56.25rem;
}

/* Tailwind keys deliberately differ from token names so nothing refers to itself. */
@theme inline {
  --color-page: var(--color-bg-primary);
  --color-surface: var(--color-bg-secondary);
  --color-subtle: var(--color-bg-tertiary);
  --color-hover: var(--color-bg-hover);
  --color-inverse: var(--color-bg-inverse);
  --color-on-inverse: var(--color-text-inverse);
  --color-ink: var(--color-text-primary);
  --color-muted: var(--color-text-secondary);
  --color-faint: var(--color-text-muted);
  --color-line: var(--color-border);
  --color-line-strong: var(--color-border-hover);
  --color-hair: var(--color-hairline);
  --color-wash: var(--color-overlay);
  --color-wash-strong: var(--color-overlay-strong);
  --color-backdrop: var(--color-scrim);
  --color-brand: var(--color-accent);
  --color-brand-hover: var(--color-accent-hover);
  --color-brand-muted: var(--color-accent-muted);
  --color-brand-line: var(--color-accent-border);
  --color-brand-glow: var(--color-accent-glow);
  --color-ok: var(--color-success);
  --color-ok-bg: var(--color-success-bg);
  --color-ok-line: var(--color-success-border);
  --color-bad: var(--color-error);
  --color-bad-bg: var(--color-error-bg);
  --color-bad-line: var(--color-error-border);
  --color-warn: var(--color-warning);
  --color-warn-bg: var(--color-warning-bg);
  --color-warn-line: var(--color-warning-border);
  --color-note: var(--color-info);
  --color-note-bg: var(--color-info-bg);
  --color-note-line: var(--color-info-border);
  --shadow-soft: var(--shadow-sm);
  --shadow-raised: var(--shadow-md);
  --shadow-float: var(--shadow-lg);
  --shadow-glow: var(--shadow-accent);
}

@layer base {
  *,
  ::before,
  ::after {
    border-color: var(--color-border);
  }
  html {
    font-size: calc(100% * var(--font-scale, 1));
  }
  body {
    margin: 0;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }
  :focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }
}

@layer components {
  .md > * + * { margin-top: 0.75rem; }
  .md p, .md li { line-height: 1.65; color: var(--color-text-secondary); }
  .md strong { color: var(--color-text-primary); font-weight: 600; }
  .md ul { list-style: disc; padding-left: 1.25rem; }
  .md ol { list-style: decimal; padding-left: 1.25rem; }
  .md a { color: var(--color-accent); text-decoration: underline; }
  .md code {
    font-family: var(--font-mono);
    font-size: 0.85em;
    background: var(--color-bg-tertiary);
    border: 1px solid var(--color-hairline);
    border-radius: 4px;
    padding: 0.1em 0.35em;
    color: var(--color-text-primary);
  }
  .md pre {
    background: var(--color-bg-tertiary);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    overflow-x: auto;
  }
  .md pre code { background: none; border: 0; padding: 0; }
  .md table { border-collapse: collapse; font-size: var(--text-sm); }
  .md th, .md td { border: 1px solid var(--color-border); padding: 0.3rem 0.6rem; text-align: left; }
  .md th { background: var(--color-bg-tertiary); }
}
```

`apps/web/src/lib/cx.ts`:
```ts
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
```

- [ ] **Step 4: Test setup for React tests**

`vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

In `vitest.config.ts`, add `setupFiles: ['./vitest.setup.ts'],` inside `test`.

- [ ] **Step 5: Write the failing preferences test**

`apps/web/src/state/prefs.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import { memoryStorage } from './storage';
import { createPrefsStore } from './prefs';

describe('prefs store', () => {
  it('defaults to the system theme and scale 1', () => {
    const store = createPrefsStore(memoryStorage(), () => true);
    expect(store.get()).toEqual({ theme: 'dark', fontScale: 1, sidebarCollapsed: false });
  });

  it('persists changes and notifies subscribers', () => {
    const kv = memoryStorage();
    const store = createPrefsStore(kv, () => false);
    const listener = vi.fn();
    store.subscribe(listener);
    store.set({ theme: 'dark', fontScale: 1.25 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(createPrefsStore(kv, () => false).get()).toMatchObject({ theme: 'dark', fontScale: 1.25 });
  });

  it('ignores invalid stored values', () => {
    const kv = memoryStorage();
    kv.set('codeadda:prefs', '{"theme":"neon","fontScale":7,"sidebarCollapsed":"yes"}');
    expect(createPrefsStore(kv, () => false).get()).toEqual({ theme: 'light', fontScale: 1, sidebarCollapsed: false });
    kv.set('codeadda:prefs', 'not json');
    expect(createPrefsStore(kv, () => false).get().theme).toBe('light');
  });

  it('keeps working in memory when localStorage throws', () => {
    const store = createPrefsStore(
      { get: () => { throw new Error('blocked'); }, set: () => { throw new Error('blocked'); } },
      () => false,
    );
    store.set({ theme: 'dark' });
    expect(store.get().theme).toBe('dark');
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run apps/web/src/state`
Expected: FAIL — cannot resolve `./storage`.

- [ ] **Step 7: Implement storage and preferences**

`apps/web/src/state/storage.ts`:
```ts
export interface KeyValue {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export function memoryStorage(): KeyValue {
  const map = new Map<string, string>();
  return { get: (k) => map.get(k) ?? null, set: (k, v) => void map.set(k, v) };
}

/** localStorage when available; falls back to memory (private mode, blocked storage, tests). */
export function safeLocalStorage(): KeyValue {
  const mem = memoryStorage();
  return {
    get(k) {
      try {
        return window.localStorage.getItem(k);
      } catch {
        return mem.get(k);
      }
    },
    set(k, v) {
      try {
        window.localStorage.setItem(k, v);
      } catch {
        mem.set(k, v);
      }
    },
  };
}
```

`apps/web/src/state/prefs.ts`:
```ts
import { useSyncExternalStore } from 'react';
import { safeLocalStorage, type KeyValue } from './storage';

export type Theme = 'light' | 'dark';
export const FONT_SCALES = [0.9, 1, 1.1, 1.25] as const;

export interface Prefs {
  theme: Theme;
  fontScale: number;
  sidebarCollapsed: boolean;
}

const KEY = 'codeadda:prefs';

function safeRead(kv: KeyValue): unknown {
  try {
    return JSON.parse(kv.get(KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function createPrefsStore(kv: KeyValue, systemDark: () => boolean) {
  const raw = (safeRead(kv) ?? {}) as Record<string, unknown>;
  let prefs: Prefs = {
    theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : systemDark() ? 'dark' : 'light',
    fontScale: FONT_SCALES.includes(raw.fontScale as (typeof FONT_SCALES)[number]) ? (raw.fontScale as number) : 1,
    sidebarCollapsed: raw.sidebarCollapsed === true,
  };
  const listeners = new Set<() => void>();

  return {
    get: (): Prefs => prefs,
    set(patch: Partial<Prefs>) {
      prefs = { ...prefs, ...patch };
      try {
        kv.set(KEY, JSON.stringify(prefs));
      } catch {
        // storage unavailable: keep in memory only
      }
      listeners.forEach((l) => l());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const prefsStore = createPrefsStore(
  safeLocalStorage(),
  () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches,
);

export function usePrefs(): Prefs {
  return useSyncExternalStore(prefsStore.subscribe, prefsStore.get);
}

export function applyPrefs(p: Prefs): void {
  document.documentElement.dataset.theme = p.theme;
  document.documentElement.style.setProperty('--font-scale', String(p.fontScale));
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run apps/web/src/state`
Expected: PASS.

- [ ] **Step 9: Write the failing registry test**

`apps/web/src/content/registry.test.ts`:
````ts
import { describe, expect, it } from 'vitest';
import { buildRegistry, getLab, labs } from './registry';

const lesson = `---
id: a
title: A
chapter: One
order: 1
dataset: d
---

## Task
Do it.

## Solution
\`\`\`sql
SELECT 1;
\`\`\`
`;
const labJson = (id: string) => JSON.stringify({ id, title: id, subtitle: '', language: 'sql', chapters: ['One'] });

describe('buildRegistry', () => {
  it('groups files by lab folder and orders labs sql → postgres → others', () => {
    const result = buildRegistry(
      {
        '../../../../content/zeta/lab.json': labJson('zeta'),
        '../../../../content/postgres/lab.json': labJson('postgres'),
        '../../../../content/sql/lab.json': labJson('sql'),
      },
      {
        '../../../../content/sql/datasets/d.sql': 'CREATE TABLE t (n int);',
        '../../../../content/sql/lessons/01/01.md': lesson,
      },
    );
    expect(result.map((l) => l.id)).toEqual(['sql', 'postgres', 'zeta']);
    expect(result[0]!.lessons[0]!.items[0]!.id).toBe('a');
    expect(result[0]!.datasets).toEqual({ d: 'CREATE TABLE t (n int);' });
  });

  it('skips a lab whose lab.json is invalid', () => {
    expect(buildRegistry({ '../../../../content/bad/lab.json': '{}' }, {})).toEqual([]);
  });
});

describe('real content', () => {
  it('loads the SQL lab from content/', () => {
    expect(labs[0]?.id).toBe('sql');
    expect(getLab('sql')?.lessons[0]?.title).toBe('Querying Data');
    expect(getLab('sql')?.errors).toEqual([]);
  });
});
````

- [ ] **Step 10: Run to verify it fails**

Run: `npx vitest run apps/web/src/content`
Expected: FAIL — cannot resolve `./registry`.

- [ ] **Step 11: Implement the registry**

`apps/web/src/content/registry.ts`:
```ts
import { buildLab } from '@codeadda/content-loader';
import type { Lab } from '@codeadda/core';

const LAB_ORDER = ['sql', 'postgres', 'mongodb', 'redis'];
const LAB_PATH = /content\/([^/]+)\/(.+)$/;

export function buildRegistry(labJsons: Record<string, string>, files: Record<string, string>): Lab[] {
  const byLab = new Map<string, { labJson?: string; files: Record<string, string> }>();
  const entry = (dir: string) => {
    let e = byLab.get(dir);
    if (!e) {
      e = { files: {} };
      byLab.set(dir, e);
    }
    return e;
  };
  for (const [path, raw] of Object.entries(labJsons)) {
    const m = LAB_PATH.exec(path);
    if (m) entry(m[1]!).labJson = raw;
  }
  for (const [path, raw] of Object.entries(files)) {
    const m = LAB_PATH.exec(path);
    if (m) entry(m[1]!).files[m[2]!] = raw;
  }

  const result: Lab[] = [];
  for (const [dir, e] of byLab) {
    if (!e.labJson) continue;
    try {
      result.push(buildLab({ labJson: e.labJson, files: e.files }));
    } catch (err) {
      console.error(`content/${dir}/lab.json is invalid:`, err);
    }
  }
  const rank = (id: string) => {
    const i = LAB_ORDER.indexOf(id);
    return i === -1 ? LAB_ORDER.length : i;
  };
  return result.sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
}

export const labs: Lab[] = buildRegistry(
  import.meta.glob<string>('../../../../content/*/lab.json', { query: '?raw', import: 'default', eager: true }),
  import.meta.glob<string>(
    ['../../../../content/*/lessons/**/*.md', '../../../../content/*/problems/**/*.md', '../../../../content/*/datasets/*'],
    { query: '?raw', import: 'default', eager: true },
  ),
);

export function getLab(id: string): Lab | undefined {
  return labs.find((l) => l.id === id);
}
```

- [ ] **Step 12: Run to verify it passes**

Run: `npx vitest run apps/web/src/content`
Expected: PASS.

- [ ] **Step 13: Navbar, theme toggle, routes and entry point**

`apps/web/src/components/ThemeToggle.tsx`:
```tsx
import { prefsStore, usePrefs } from '../state/prefs';

export function ThemeToggle() {
  const { theme } = usePrefs();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={() => prefsStore.set({ theme: next })}
      aria-label={`Switch to ${next} mode`}
      className="grid size-9 place-items-center rounded-md text-lg text-muted transition-colors hover:bg-hover hover:text-ink"
    >
      <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
    </button>
  );
}
```

`apps/web/src/components/Navbar.tsx`:
```tsx
import { Link, NavLink } from 'react-router';
import { labs } from '../content/registry';
import { cx } from '../lib/cx';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  return (
    <header className="sticky top-0 z-[1000] h-(--navbar-height) border-b border-line bg-[color-mix(in_srgb,var(--color-bg-secondary)_82%,transparent)] backdrop-blur">
      <nav aria-label="Labs" className="mx-auto flex h-full max-w-[1440px] items-center gap-4 px-4 lab:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold text-ink">
          <span className="grid size-7 place-items-center rounded-md bg-brand text-xs font-bold text-white shadow-glow">DB</span>
          <span className="hidden sm:inline">CodeAdda</span>
        </Link>
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
          {labs.map((lab) => (
            <NavLink
              key={lab.id}
              to={`/${lab.id}`}
              className={({ isActive }) =>
                cx(
                  'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-muted text-brand' : 'text-muted hover:bg-hover hover:text-ink',
                )
              }
            >
              {lab.title}
            </NavLink>
          ))}
        </div>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
```

`apps/web/src/components/NotFound.tsx`:
```tsx
import { Link } from 'react-router';
import { labs } from '../content/registry';

export function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted">That lab or lesson does not exist.</p>
      {labs[0] && (
        <Link to={`/${labs[0].id}`} className="mt-6 inline-block rounded-md bg-inverse px-4 py-2 text-sm font-semibold text-on-inverse">
          Go to {labs[0].title}
        </Link>
      )}
    </div>
  );
}
```

`apps/web/src/lab/LabRoute.tsx` (placeholder — Task 9 replaces the whole file):
```tsx
import { useParams } from 'react-router';
import { getLab } from '../content/registry';
import { NotFound } from '../components/NotFound';

export function LabRoute() {
  const { labId = '' } = useParams();
  const lab = getLab(labId);
  if (!lab) return <NotFound />;
  return <p className="p-6 text-muted">{lab.title} — coming together in the next tasks.</p>;
}
```

`apps/web/src/App.tsx`:
```tsx
import { Navigate, Route, Routes } from 'react-router';
import { labs } from './content/registry';
import { Navbar } from './components/Navbar';
import { NotFound } from './components/NotFound';
import { LabRoute } from './lab/LabRoute';

function Home() {
  return labs[0] ? <Navigate to={`/${labs[0].id}`} replace /> : <p className="p-6">No labs found in content/.</p>;
}

export function App() {
  return (
    <div className="min-h-dvh bg-page text-ink">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:labId" element={<LabRoute />} />
        <Route path="/:labId/:tab/:itemId" element={<LabRoute />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
```

`apps/web/src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './styles/app.css';
import { App } from './App';
import { applyPrefs, prefsStore } from './state/prefs';

applyPrefs(prefsStore.get());
prefsStore.subscribe(() => applyPrefs(prefsStore.get()));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

- [ ] **Step 14: Verify in the browser**

Run: `npm run dev`, open `http://localhost:5173`.
Expected: redirect to `/sql`; the navbar shows the orange "DB" mark, "CodeAdda" and a highlighted "SQL Lab" link; the placeholder text shows; the ☾ button switches the page to the dark palette (`#111010` background) and back; after a reload the chosen theme is kept.

- [ ] **Step 15: Typecheck and run all tests**

Run: `npm run typecheck && npm test`
Expected: no type errors; all tests pass.

---

### Task 7: Worker engine (runs any Engine in a Web Worker, with timeouts)

**Files:**
- Create: `apps/web/src/engine/protocol.ts`, `apps/web/src/engine/engine.worker.ts`, `apps/web/src/engine/WorkerEngine.ts`, `apps/web/src/engine/createEngine.ts`
- Test: `apps/web/src/engine/WorkerEngine.test.ts`

**Interfaces:**
- Consumes: `Engine`, `Dataset`, `QueryResult`, `SchemaInfo`, `LabLanguage` (Task 1); `PgliteEngine` (Task 4).
- Produces: `type EngineMethod = 'setup' | 'run' | 'reset' | 'snapshot' | 'describe' | 'dispose'`, `WorkerRequest`, `WorkerResponse`; `class WorkerEngine implements Engine` with `constructor(spawn: () => Worker, kind: LabLanguage, defaultTimeoutMs = 5000)`; `createEngine(language: LabLanguage): Engine`.

Behaviour: `run()` races the worker against the timeout; on timeout it terminates the worker, rejects everything pending, starts a new worker, replays `setup(lastDataset)`, and resolves `{ ok: false, error: { message: 'Query timed out after 5 seconds. The database was reset to the lesson data.' } }` (seconds taken from the timeout). A worker `error` event rejects all pending calls.

- [ ] **Step 1: Write the failing tests**

`apps/web/src/engine/WorkerEngine.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Dataset } from '@codeadda/core';
import type { WorkerRequest } from './protocol';
import { WorkerEngine } from './WorkerEngine';

const HANG = Symbol('hang');
type Handler = (req: WorkerRequest) => unknown;

class FakeWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  terminated = false;
  received: WorkerRequest[] = [];
  constructor(private handle: Handler) {}
  postMessage(req: WorkerRequest) {
    this.received.push(req);
    const out = this.handle(req);
    if (out === HANG) return;
    queueMicrotask(() =>
      this.onmessage?.({
        data: out instanceof Error ? { id: req.id, ok: false, error: out.message } : { id: req.id, ok: true, value: out },
      } as MessageEvent),
    );
  }
  terminate() {
    this.terminated = true;
  }
}

function setup(handler: Handler) {
  const workers: FakeWorker[] = [];
  const engine = new WorkerEngine(() => {
    const w = new FakeWorker(handler);
    workers.push(w);
    return w as unknown as Worker;
  }, 'sql', 50);
  return { engine, workers };
}

const ds: Dataset = { name: 'shop', source: 'CREATE TABLE t (n int);' };
const okResult = { ok: true, columns: ['n'], rows: [[1]], rowCount: 1, durationMs: 1 };

describe('WorkerEngine', () => {
  it('forwards calls and returns the worker result', async () => {
    const { engine, workers } = setup((req) => (req.method === 'run' ? okResult : undefined));
    await engine.setup(ds);
    expect(await engine.run('SELECT 1')).toEqual(okResult);
    expect(workers[0]!.received.map((r) => r.method)).toEqual(['setup', 'run']);
  });

  it('times out a hanging query, restarts the worker and replays setup', async () => {
    const { engine, workers } = setup((req) => (req.method === 'run' && req.args[0] === 'LOOP' ? HANG : req.method === 'run' ? okResult : undefined));
    await engine.setup(ds);
    const r = await engine.run('LOOP');
    expect(r).toEqual({ ok: false, error: { message: 'Query timed out after 0.05 seconds. The database was reset to the lesson data.' } });
    expect(workers[0]!.terminated).toBe(true);
    expect(workers).toHaveLength(2);
    expect(workers[1]!.received[0]).toMatchObject({ method: 'setup', args: [ds] });
    expect(await engine.run('SELECT 1')).toEqual(okResult);
  });

  it('rejects when the worker reports an error', async () => {
    const { engine } = setup((req) => (req.method === 'describe' ? new Error('catalog broken') : undefined));
    await expect(engine.describe()).rejects.toThrow('catalog broken');
  });

  it('rejects pending calls when the worker crashes', async () => {
    const { engine, workers } = setup(() => HANG);
    const pending = engine.describe();
    workers[0]!.onerror?.({ message: 'boom' } as ErrorEvent);
    await expect(pending).rejects.toThrow('boom');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run apps/web/src/engine`
Expected: FAIL — cannot resolve `./protocol`.

- [ ] **Step 3: Implement protocol, worker, WorkerEngine and factory**

`apps/web/src/engine/protocol.ts`:
```ts
export type EngineMethod = 'setup' | 'run' | 'reset' | 'snapshot' | 'describe' | 'dispose';

export interface WorkerRequest {
  id: number;
  method: EngineMethod;
  args: unknown[];
}

export type WorkerResponse = { id: number; ok: true; value: unknown } | { id: number; ok: false; error: string };
```

`apps/web/src/engine/engine.worker.ts`:
```ts
import { PgliteEngine } from '@codeadda/engine-pglite';
import type { WorkerRequest, WorkerResponse } from './protocol';

const engine = new PgliteEngine();

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, method, args } = e.data;
  let response: WorkerResponse;
  try {
    const fn = engine[method] as unknown as (...a: unknown[]) => Promise<unknown>;
    response = { id, ok: true, value: await fn.apply(engine, args) };
  } catch (err) {
    response = { id, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  self.postMessage(response);
};
```

`apps/web/src/engine/WorkerEngine.ts`:
```ts
import type { Dataset, Engine, LabLanguage, QueryResult, RunOptions, SchemaInfo } from '@codeadda/core';
import type { EngineMethod, WorkerResponse } from './protocol';

interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
}

export class WorkerEngine implements Engine {
  readonly mode = 'browser' as const;
  private worker: Worker;
  private pending = new Map<number, Pending>();
  private seq = 0;
  private dataset?: Dataset;

  constructor(
    private spawn: () => Worker,
    readonly kind: LabLanguage,
    private defaultTimeoutMs = 5000,
  ) {
    this.worker = this.start();
  }

  private start(): Worker {
    const w = this.spawn();
    w.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const res = e.data;
      const p = this.pending.get(res.id);
      if (!p) return;
      this.pending.delete(res.id);
      if (res.ok) p.resolve(res.value);
      else p.reject(new Error(res.error));
    };
    w.onerror = (e: ErrorEvent) => this.rejectAll(new Error(e.message || 'The database engine failed to start.'));
    return w;
  }

  private rejectAll(err: Error) {
    for (const p of this.pending.values()) p.reject(err);
    this.pending.clear();
  }

  private call<T>(method: EngineMethod, args: unknown[] = []): Promise<T> {
    const id = ++this.seq;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.worker.postMessage({ id, method, args });
    });
  }

  private async restart(): Promise<void> {
    this.worker.terminate();
    this.rejectAll(new Error('The database engine was restarted.'));
    this.worker = this.start();
    if (this.dataset) await this.call('setup', [this.dataset]);
  }

  async setup(dataset: Dataset): Promise<void> {
    this.dataset = dataset;
    await this.call('setup', [dataset]);
  }

  async run(query: string, opts?: RunOptions): Promise<QueryResult> {
    const ms = opts?.timeoutMs ?? this.defaultTimeoutMs;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), ms);
    });
    const outcome = await Promise.race([this.call<QueryResult>('run', [query]), timeout]);
    clearTimeout(timer);
    if (outcome === 'timeout') {
      await this.restart();
      return {
        ok: false,
        error: { message: `Query timed out after ${ms / 1000} seconds. The database was reset to the lesson data.` },
      };
    }
    return outcome;
  }

  reset(): Promise<void> {
    return this.call('reset');
  }

  snapshot(query: string): Promise<QueryResult> {
    return this.run(query);
  }

  describe(): Promise<SchemaInfo> {
    return this.call('describe');
  }

  async dispose(): Promise<void> {
    this.worker.terminate();
    this.rejectAll(new Error('The database engine was closed.'));
  }
}
```

`apps/web/src/engine/createEngine.ts`:
```ts
import type { Engine, LabLanguage } from '@codeadda/core';
import { WorkerEngine } from './WorkerEngine';

export function createEngine(language: LabLanguage): Engine {
  if (language === 'sql') {
    return new WorkerEngine(() => new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' }), 'sql');
  }
  throw new Error(`No engine available for ${language} labs yet.`);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run apps/web/src/engine && npm run typecheck`
Expected: PASS, no type errors.

---

### Task 8: Progress store

**Files:**
- Create: `apps/web/src/state/progress.ts`
- Test: `apps/web/src/state/progress.test.ts`

**Interfaces:**
- Consumes: `KeyValue`, `safeLocalStorage` (Task 6).
- Produces: `interface ProgressStore { isComplete(labId: string, itemId: string): boolean; markComplete(labId: string, itemId: string): void; completedCount(labId: string): number; getDraft(labId: string, itemId: string): string | undefined; saveDraft(labId: string, itemId: string, query: string): void; subscribe(fn: () => void): () => void; version(): number }`; `createProgressStore(kv: KeyValue): ProgressStore`; `progressStore`; `useProgress(store?: ProgressStore): ProgressStore` (re-renders on completion changes). Storage key `codeadda:progress:v1`. Saving a draft does **not** notify subscribers.

- [ ] **Step 1: Write the failing tests**

`apps/web/src/state/progress.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import { createProgressStore } from './progress';
import { memoryStorage } from './storage';

describe('progress store', () => {
  it('marks items complete, persists and notifies', () => {
    const kv = memoryStorage();
    const store = createProgressStore(kv);
    const listener = vi.fn();
    store.subscribe(listener);
    store.markComplete('sql', 'select-all');
    store.markComplete('sql', 'select-all');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.version()).toBe(1);
    const again = createProgressStore(kv);
    expect(again.isComplete('sql', 'select-all')).toBe(true);
    expect(again.isComplete('sql', 'other')).toBe(false);
    expect(again.completedCount('sql')).toBe(1);
  });

  it('saves drafts without notifying', () => {
    const kv = memoryStorage();
    const store = createProgressStore(kv);
    const listener = vi.fn();
    store.subscribe(listener);
    store.saveDraft('sql', 'a', 'SELECT 1;');
    expect(listener).not.toHaveBeenCalled();
    expect(createProgressStore(kv).getDraft('sql', 'a')).toBe('SELECT 1;');
  });

  it('starts empty when stored data is broken', () => {
    const kv = memoryStorage();
    kv.set('codeadda:progress:v1', '[1,2');
    expect(createProgressStore(kv).completedCount('sql')).toBe(0);
    kv.set('codeadda:progress:v1', '{"sql":{"done":"nope"}}');
    const store = createProgressStore(kv);
    store.markComplete('sql', 'a');
    expect(store.isComplete('sql', 'a')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run apps/web/src/state/progress.test.ts`
Expected: FAIL — cannot resolve `./progress`.

- [ ] **Step 3: Implement**

`apps/web/src/state/progress.ts`:
```ts
import { useSyncExternalStore } from 'react';
import { safeLocalStorage, type KeyValue } from './storage';

export interface ProgressStore {
  isComplete(labId: string, itemId: string): boolean;
  markComplete(labId: string, itemId: string): void;
  completedCount(labId: string): number;
  getDraft(labId: string, itemId: string): string | undefined;
  saveDraft(labId: string, itemId: string, query: string): void;
  subscribe(fn: () => void): () => void;
  version(): number;
}

interface LabProgress {
  done: string[];
  drafts: Record<string, string>;
}

const KEY = 'codeadda:progress:v1';

export function createProgressStore(kv: KeyValue): ProgressStore {
  let data: Record<string, LabProgress> = {};
  try {
    const parsed: unknown = JSON.parse(kv.get(KEY) ?? '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed as Record<string, LabProgress>;
  } catch {
    data = {};
  }
  let version = 0;
  const listeners = new Set<() => void>();

  const lab = (id: string): LabProgress => {
    const e = (data[id] ??= { done: [], drafts: {} });
    if (!Array.isArray(e.done)) e.done = [];
    if (!e.drafts || typeof e.drafts !== 'object') e.drafts = {};
    return e;
  };
  const save = (notify: boolean) => {
    try {
      kv.set(KEY, JSON.stringify(data));
    } catch {
      // keep in memory
    }
    if (notify) {
      version++;
      listeners.forEach((l) => l());
    }
  };

  return {
    isComplete: (l, i) => lab(l).done.includes(i),
    markComplete(l, i) {
      const e = lab(l);
      if (e.done.includes(i)) return;
      e.done.push(i);
      save(true);
    },
    completedCount: (l) => lab(l).done.length,
    getDraft: (l, i) => lab(l).drafts[i],
    saveDraft(l, i, q) {
      lab(l).drafts[i] = q;
      save(false);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    version: () => version,
  };
}

export const progressStore = createProgressStore(safeLocalStorage());

export function useProgress(store: ProgressStore = progressStore): ProgressStore {
  useSyncExternalStore(store.subscribe, store.version);
  return store;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run apps/web/src/state`
Expected: PASS.

---

### Task 9: Lab shell — navigation helpers, header, mode tabs, sidebar with drawer, lesson header

**Files:**
- Create: `apps/web/src/lab/navigation.ts`
- Create: `apps/web/src/components/DifficultyBadge.tsx`, `Markdown.tsx`, `FontSizeSettings.tsx`, `ModeTabs.tsx`, `LabHeader.tsx`, `Sidebar.tsx`, `LessonHeader.tsx`
- Replace: `apps/web/src/lab/LabRoute.tsx`
- Test: `apps/web/src/lab/navigation.test.ts`, `apps/web/src/components/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `Lab`, `LessonItem`, `Chapter`, `ContentError` (Task 1); `getLab` (Task 6); `prefsStore`, `usePrefs`, `FONT_SCALES` (Task 6); `progressStore`, `useProgress` (Task 8); `cx` (Task 6).
- Produces: `type Tab = 'lessons' | 'problems'`; `chaptersFor(lab: Lab, tab: Tab): Chapter[]`; `flatItems(lab: Lab, tab: Tab): LessonItem[]`; `itemPath(labId: string, tab: Tab, itemId: string): string`; `numberOf(lab: Lab, tab: Tab, itemId: string): number` (1-based across chapters); components with the props shown below; `LabRoute` (route resolution) and `LabView({ lab, tab, item })` (layout) — Task 11 replaces `LabView`'s body.

- [ ] **Step 1: Write the failing navigation test**

`apps/web/src/lab/navigation.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Lab, LessonItem } from '@codeadda/core';
import { chaptersFor, flatItems, itemPath, numberOf } from './navigation';

const item = (id: string, chapter: string, kind: 'lesson' | 'problem' = 'lesson'): LessonItem => ({
  kind, id, title: id, chapter, order: 1, dataset: 'd', check: 'rows-unordered', body: '', task: '', hints: [], solution: '', path: '',
});
const lab: Lab = {
  id: 'sql', title: 'SQL Lab', subtitle: '', language: 'sql', datasets: {}, errors: [],
  lessons: [{ title: 'A', items: [item('a1', 'A'), item('a2', 'A')] }, { title: 'B', items: [item('b1', 'B')] }],
  problems: [{ title: 'P', items: [item('p1', 'P', 'problem')] }],
};

describe('navigation', () => {
  it('flattens items per tab', () => {
    expect(flatItems(lab, 'lessons').map((i) => i.id)).toEqual(['a1', 'a2', 'b1']);
    expect(chaptersFor(lab, 'problems')[0]!.title).toBe('P');
  });
  it('numbers items across chapters', () => {
    expect(numberOf(lab, 'lessons', 'b1')).toBe(3);
    expect(numberOf(lab, 'problems', 'p1')).toBe(1);
  });
  it('builds paths', () => {
    expect(itemPath('sql', 'lessons', 'a1')).toBe('/sql/lessons/a1');
  });
});
```

- [ ] **Step 2: Run to verify it fails, then implement**

Run: `npx vitest run apps/web/src/lab/navigation.test.ts` → FAIL (module missing).

`apps/web/src/lab/navigation.ts`:
```ts
import type { Chapter, Lab, LessonItem } from '@codeadda/core';

export type Tab = 'lessons' | 'problems';

export function chaptersFor(lab: Lab, tab: Tab): Chapter[] {
  return tab === 'lessons' ? lab.lessons : lab.problems;
}

export function flatItems(lab: Lab, tab: Tab): LessonItem[] {
  return chaptersFor(lab, tab).flatMap((c) => c.items);
}

export function itemPath(labId: string, tab: Tab, itemId: string): string {
  return `/${labId}/${tab}/${itemId}`;
}

export function numberOf(lab: Lab, tab: Tab, itemId: string): number {
  return flatItems(lab, tab).findIndex((i) => i.id === itemId) + 1;
}
```

Run again → PASS.

- [ ] **Step 3: Small shared components**

`apps/web/src/components/DifficultyBadge.tsx`:
```tsx
import type { Difficulty } from '@codeadda/core';
import { cx } from '../lib/cx';

const TONE: Record<Difficulty, string> = {
  Easy: 'border-ok-line bg-ok-bg text-ok',
  Medium: 'border-warn-line bg-warn-bg text-warn',
  Hard: 'border-bad-line bg-bad-bg text-bad',
};

export function DifficultyBadge({ level }: { level: Difficulty }) {
  return <span className={cx('shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium', TONE[level])}>{level}</span>;
}
```

`apps/web/src/components/Markdown.tsx`:
```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cx } from '../lib/cx';

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cx('md', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
```

`apps/web/src/components/FontSizeSettings.tsx`:
```tsx
import { useState } from 'react';
import { cx } from '../lib/cx';
import { FONT_SCALES, prefsStore, usePrefs } from '../state/prefs';

export function FontSizeSettings() {
  const { fontScale } = usePrefs();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Text size settings"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-line px-2.5 py-1.5 text-sm font-semibold text-muted hover:bg-hover hover:text-ink"
      >
        Aa
      </button>
      {open && (
        <div role="dialog" aria-label="Text size" className="absolute right-0 z-[2000] mt-2 w-40 rounded-lg border border-line bg-surface p-1.5 shadow-float">
          {FONT_SCALES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={fontScale === s}
              onClick={() => {
                prefsStore.set({ fontScale: s });
                setOpen(false);
              }}
              className={cx(
                'block w-full rounded-md px-3 py-1.5 text-left text-sm',
                fontScale === s ? 'bg-brand-muted font-medium text-brand' : 'text-ink hover:bg-hover',
              )}
            >
              {Math.round(s * 100)}%
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

`apps/web/src/components/ModeTabs.tsx`:
```tsx
import { Link } from 'react-router';
import type { Lab } from '@codeadda/core';
import { cx } from '../lib/cx';
import { flatItems, itemPath, type Tab } from '../lab/navigation';

const LABELS: Record<Tab, string> = { lessons: 'Lessons', problems: 'Problems' };

export function ModeTabs({ lab, tab }: { lab: Lab; tab: Tab }) {
  const tabs = (['lessons', 'problems'] as const).flatMap((id) => {
    const first = flatItems(lab, id)[0];
    return first ? [{ id, first }] : [];
  });
  if (tabs.length < 2) return null;
  return (
    <div role="tablist" aria-label="Lab mode" className="flex rounded-lg border border-line bg-subtle p-1">
      {tabs.map((t) => (
        <Link
          key={t.id}
          role="tab"
          aria-selected={tab === t.id}
          to={itemPath(lab.id, t.id, t.first.id)}
          className={cx(
            'rounded-md px-3 py-1 text-sm font-medium transition-colors',
            tab === t.id ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:text-ink',
          )}
        >
          {LABELS[t.id]}
        </Link>
      ))}
    </div>
  );
}
```

`apps/web/src/components/LabHeader.tsx`:
```tsx
import type { Lab } from '@codeadda/core';
import type { Tab } from '../lab/navigation';
import { FontSizeSettings } from './FontSizeSettings';
import { ModeTabs } from './ModeTabs';

interface LabHeaderProps {
  lab: Lab;
  tab: Tab;
  onOpenDrawer: () => void;
  onReset?: () => void;
  resetDisabled?: boolean;
}

export function LabHeader({ lab, tab, onOpenDrawer, onReset, resetDisabled }: LabHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3 lab:px-6">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open lesson list"
        className="rounded-md border border-line px-2.5 py-1.5 text-sm text-muted hover:bg-hover lab:hidden"
      >
        ☰
      </button>
      <div className="mr-auto min-w-0">
        <p className="text-xl font-bold tracking-tight">{lab.title}</p>
        {lab.subtitle && <p className="truncate text-sm text-muted">{lab.subtitle}</p>}
      </div>
      <ModeTabs lab={lab} tab={tab} />
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          disabled={resetDisabled}
          title="Reset the practice database"
          className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:bg-hover hover:text-ink disabled:opacity-50"
        >
          Reset DB
        </button>
      )}
      <FontSizeSettings />
    </div>
  );
}
```

`apps/web/src/components/LessonHeader.tsx`:
```tsx
import type { LessonItem } from '@codeadda/core';
import type { Tab } from '../lab/navigation';
import { DifficultyBadge } from './DifficultyBadge';
import { Markdown } from './Markdown';

export function LessonHeader({ tab, item, number }: { tab: Tab; item: LessonItem; number: number }) {
  return (
    <header className="mb-6">
      <p className="mb-2 flex flex-wrap items-center gap-2 text-sm text-muted">
        <span>{item.chapter}</span>
        <span aria-hidden="true">·</span>
        <span>
          {tab === 'lessons' ? 'Lesson' : 'Problem'} {number}
        </span>
        {item.difficulty && <DifficultyBadge level={item.difficulty} />}
      </p>
      <h1 className="text-2xl font-bold tracking-tight">{item.title}</h1>
      {item.body && <Markdown className="mt-3">{item.body}</Markdown>}
      {item.example && (
        <section className="mt-5">
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Example</h2>
          <Markdown>{item.example}</Markdown>
        </section>
      )}
    </header>
  );
}
```

- [ ] **Step 4: Write the failing Sidebar test**

`apps/web/src/components/Sidebar.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { Lab, LessonItem } from '@codeadda/core';
import { Sidebar } from './Sidebar';

const item = (id: string, chapter: string): LessonItem => ({
  kind: 'lesson', id, title: `Title ${id}`, chapter, order: 1, dataset: 'd', check: 'rows-unordered',
  body: '', task: '', hints: [], solution: '', path: '',
});
const lab: Lab = {
  id: 'sql', title: 'SQL Lab', subtitle: 'Learn', language: 'sql', datasets: {},
  errors: [{ path: 'lessons/x.md', message: 'Missing "## Task" section' }],
  lessons: [{ title: 'Basics', items: [item('a', 'Basics'), item('b', 'Basics')] }, { title: 'Joins', items: [item('c', 'Joins')] }],
  problems: [],
};

function renderSidebar(activeId = 'b') {
  const onCloseDrawer = vi.fn();
  render(
    <MemoryRouter>
      <Sidebar
        lab={lab}
        tab="lessons"
        activeId={activeId}
        collapsed={false}
        onToggleCollapsed={() => {}}
        drawerOpen={false}
        onCloseDrawer={onCloseDrawer}
        isComplete={(id) => id === 'a'}
      />
    </MemoryRouter>,
  );
  return { onCloseDrawer };
}

describe('Sidebar', () => {
  it('opens the chapter of the active item and marks it current', () => {
    renderSidebar('b');
    expect(screen.getByRole('link', { name: /Title b/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /Basics/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('link', { name: /Title c/ })).not.toBeInTheDocument();
  });

  it('numbers lessons across chapters and toggles chapters', async () => {
    renderSidebar('b');
    await userEvent.click(screen.getByRole('button', { name: /Joins/ }));
    expect(screen.getByRole('link', { name: /Title c/ })).toHaveTextContent('3');
  });

  it('shows completion ticks and content errors', () => {
    renderSidebar('b');
    expect(screen.getByRole('link', { name: /Title a/ })).toContainElement(screen.getByLabelText('completed'));
    expect(screen.getByRole('alert')).toHaveTextContent('lessons/x.md');
  });

  it('closes the drawer when a lesson is chosen', async () => {
    const { onCloseDrawer } = renderSidebar('b');
    await userEvent.click(screen.getByRole('link', { name: /Title a/ }));
    expect(onCloseDrawer).toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Run to verify it fails**

Run: `npx vitest run apps/web/src/components/Sidebar.test.tsx`
Expected: FAIL — cannot resolve `./Sidebar`.

- [ ] **Step 6: Implement the Sidebar**

`apps/web/src/components/Sidebar.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { ContentError, Lab } from '@codeadda/core';
import { cx } from '../lib/cx';
import { chaptersFor, itemPath, type Tab } from '../lab/navigation';
import { DifficultyBadge } from './DifficultyBadge';

export interface SidebarProps {
  lab: Lab;
  tab: Tab;
  activeId: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
  isComplete: (itemId: string) => boolean;
}

function ContentErrors({ errors }: { errors: ContentError[] }) {
  return (
    <div role="alert" className="m-3 rounded-md border border-bad-line bg-bad-bg p-3 text-xs text-bad">
      <p className="font-semibold">Some content files have problems</p>
      <ul className="mt-1 space-y-1">
        {errors.map((e) => (
          <li key={`${e.path}:${e.message}`}>
            <code className="font-mono">{e.path}</code>: {e.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sidebar({ lab, tab, activeId, collapsed, onToggleCollapsed, drawerOpen, onCloseDrawer, isComplete }: SidebarProps) {
  const chapters = chaptersFor(lab, tab);
  const activeChapter = chapters.find((c) => c.items.some((i) => i.id === activeId))?.title;
  const [open, setOpen] = useState<Record<string, boolean>>(() => (activeChapter ? { [activeChapter]: true } : {}));

  useEffect(() => {
    if (activeChapter) setOpen((o) => (o[activeChapter] ? o : { ...o, [activeChapter]: true }));
  }, [activeChapter]);

  const heading =
    tab === 'lessons'
      ? { title: lab.title, subtitle: lab.subtitle }
      : { title: 'Problems', subtitle: 'Practice problems, easy to hard' };

  let counter = 0;

  return (
    <>
      {drawerOpen && <div className="fixed inset-0 z-[1500] bg-backdrop lab:hidden" onClick={onCloseDrawer} aria-hidden="true" />}
      <aside
        aria-label="Lesson list"
        className={cx(
          'fixed inset-y-0 left-0 z-[1600] flex w-(--sidebar-width) flex-col border-r border-line bg-surface transition-transform duration-200',
          'lab:static lab:z-auto lab:translate-x-0',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed && 'lab:w-12',
        )}
      >
        {collapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Show lesson list"
            className="hidden h-full w-12 justify-center pt-4 text-lg text-faint hover:bg-hover hover:text-ink lab:flex"
          >
            ›
          </button>
        )}
        <div className={cx('flex min-h-0 flex-1 flex-col', collapsed && 'lab:hidden')}>
          <div className="flex items-start gap-2 border-b border-line px-4 py-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold">{heading.title}</h2>
              {heading.subtitle && <p className="text-sm text-muted">{heading.subtitle}</p>}
            </div>
            <button type="button" onClick={onCloseDrawer} aria-label="Close lesson list" className="rounded-md px-2 py-1 text-muted hover:bg-hover lab:hidden">
              ✕
            </button>
            <button type="button" onClick={onToggleCollapsed} aria-label="Hide lesson list" className="hidden rounded-md px-2 py-1 text-muted hover:bg-hover lab:block">
              ‹
            </button>
          </div>
          <nav aria-label="Chapters" className="min-h-0 flex-1 overflow-y-auto py-2">
            {chapters.map((ch) => {
              const isOpen = !!open[ch.title];
              const start = counter;
              counter += ch.items.length;
              return (
                <section key={ch.title}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen((o) => ({ ...o, [ch.title]: !isOpen }))}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold tracking-wide text-muted uppercase hover:text-ink"
                  >
                    <span aria-hidden="true" className={cx('inline-block transition-transform', isOpen && 'rotate-90')}>
                      ›
                    </span>
                    {ch.title}
                  </button>
                  {isOpen && (
                    <ul>
                      {ch.items.map((it, idx) => {
                        const active = it.id === activeId;
                        return (
                          <li key={it.id}>
                            <Link
                              to={itemPath(lab.id, tab, it.id)}
                              onClick={onCloseDrawer}
                              aria-current={active ? 'page' : undefined}
                              className={cx(
                                'flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                                active ? 'bg-brand-muted font-medium text-brand' : 'text-ink hover:bg-hover',
                              )}
                            >
                              <span className="w-6 shrink-0 text-right font-mono text-xs text-faint">{start + idx + 1}</span>
                              <span className="min-w-0 flex-1 truncate">{it.title}</span>
                              {it.difficulty && <DifficultyBadge level={it.difficulty} />}
                              {isComplete(it.id) && (
                                <span aria-label="completed" className="text-ok">
                                  ✓
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
            {lab.errors.length > 0 && <ContentErrors errors={lab.errors} />}
          </nav>
        </div>
      </aside>
    </>
  );
}
```

- [ ] **Step 7: Run to verify it passes**

Run: `npx vitest run apps/web/src/components/Sidebar.test.tsx`
Expected: PASS.

- [ ] **Step 8: Replace `LabRoute.tsx` with route resolution + layout**

`apps/web/src/lab/LabRoute.tsx`:
```tsx
import { useState } from 'react';
import { Navigate, useParams } from 'react-router';
import type { Lab, LessonItem } from '@codeadda/core';
import { getLab } from '../content/registry';
import { LabHeader } from '../components/LabHeader';
import { LessonHeader } from '../components/LessonHeader';
import { NotFound } from '../components/NotFound';
import { Sidebar } from '../components/Sidebar';
import { prefsStore, usePrefs } from '../state/prefs';
import { useProgress } from '../state/progress';
import { flatItems, itemPath, numberOf, type Tab } from './navigation';

export function LabRoute() {
  const { labId = '', tab, itemId } = useParams();
  const lab = getLab(labId);
  if (!lab) return <NotFound />;

  const t: Tab = tab === 'problems' && lab.problems.length > 0 ? 'problems' : 'lessons';
  const items = flatItems(lab, t);
  const item = items.find((i) => i.id === itemId);
  if (!item || tab !== t) {
    const target = item ?? items[0];
    if (!target) {
      return (
        <div className="p-6">
          <p className="font-semibold">{lab.title} has no lessons yet.</p>
          {lab.errors.map((e) => (
            <p key={e.path} className="text-sm text-bad">
              {e.path}: {e.message}
            </p>
          ))}
        </div>
      );
    }
    return <Navigate to={itemPath(lab.id, t, target.id)} replace />;
  }
  return <LabView key={lab.id} lab={lab} tab={t} item={item} />;
}

export function LabView({ lab, tab, item }: { lab: Lab; tab: Tab; item: LessonItem }) {
  const prefs = usePrefs();
  const progress = useProgress();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-[calc(100dvh_-_var(--navbar-height))] flex-col">
      <LabHeader lab={lab} tab={tab} onOpenDrawer={() => setDrawerOpen(true)} />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar
          lab={lab}
          tab={tab}
          activeId={item.id}
          collapsed={prefs.sidebarCollapsed}
          onToggleCollapsed={() => prefsStore.set({ sidebarCollapsed: !prefs.sidebarCollapsed })}
          drawerOpen={drawerOpen}
          onCloseDrawer={() => setDrawerOpen(false)}
          isComplete={(id) => progress.isComplete(lab.id, id)}
        />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1100px] px-4 py-6 lab:px-8">
            <LessonHeader tab={tab} item={item} number={numberOf(lab, tab, item.id)} />
          </div>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Verify in the browser**

Run: `npm run dev`, open `http://localhost:5173`.
Expected: redirect to `/sql/lessons/select-all`; header shows "SQL Lab", subtitle, "Aa"; sidebar lists "Querying Data" (open) with lessons 1–5, lesson 1 highlighted; clicking lesson 2 changes the URL and title; "‹" collapses the sidebar to a 48px rail and "›" restores it (kept after reload); at a window width under 900px the sidebar is hidden, "☰" opens it as a drawer over a dim backdrop, and choosing a lesson closes it; "Aa" → 125% enlarges all text.

- [ ] **Step 10: Typecheck and tests**

Run: `npm run typecheck && npm test`
Expected: all pass.

---

### Task 10: Results table, results panel, check banner with difference view, schema viewer

**Files:**
- Create: `apps/web/src/components/ResultTable.tsx`, `ResultsPanel.tsx`, `CheckBanner.tsx`, `SchemaViewer.tsx`
- Test: `apps/web/src/components/ResultsPanel.test.tsx`, `CheckBanner.test.tsx`, `SchemaViewer.test.tsx`

**Interfaces:**
- Consumes: `QueryResult`, `SchemaInfo`, `TableInfo`, `CheckResult`, `markRows` (Tasks 1–2); `cx`.
- Produces: `ResultTable({ columns: string[]; rows: unknown[][]; highlight?: Set<number>; tone?: 'ok' | 'bad'; label?: string })` (shows at most 1,000 rows, `NULL` for null); `ResultsPanel({ result?: QueryResult; running: boolean })`; `CheckBanner({ check: CheckResult })` (pass → "Correct!", fail → "Not quite." + optional "Show difference"); `SchemaViewer({ schema?: SchemaInfo; onSample: (t: TableInfo) => void })`.

- [ ] **Step 1: Write the failing component tests**

`apps/web/src/components/ResultsPanel.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultsPanel } from './ResultsPanel';

describe('ResultsPanel', () => {
  it('shows a placeholder before any query', () => {
    render(<ResultsPanel running={false} />);
    expect(screen.getByText('Run a query to see results')).toBeInTheDocument();
  });

  it('renders rows, NULLs and the row count', () => {
    render(
      <ResultsPanel
        running={false}
        result={{ ok: true, columns: ['id', 'phone'], rows: [[1, null], [2, '555']], rowCount: 2, durationMs: 3 }}
      />,
    );
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText('NULL')).toBeInTheDocument();
    expect(screen.getByText('2 rows · 3 ms')).toBeInTheDocument();
  });

  it('renders errors as an alert', () => {
    render(<ResultsPanel running={false} result={{ ok: false, error: { message: 'syntax error at or near "FORM"', position: 10 } }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('syntax error at or near "FORM"');
    expect(screen.getByRole('alert')).toHaveTextContent('At character 10');
  });

  it('renders notices', () => {
    render(<ResultsPanel running={false} result={{ ok: true, columns: [], rows: [], rowCount: 0, durationMs: 1, notice: 'Query OK. 1 row(s) affected.' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Query OK. 1 row(s) affected.');
  });
});
```

`apps/web/src/components/CheckBanner.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckBanner } from './CheckBanner';

const res = (rows: unknown[][]) => ({ ok: true as const, columns: ['n'], rows, rowCount: rows.length, durationMs: 0 });

describe('CheckBanner', () => {
  it('celebrates a pass', () => {
    render(<CheckBanner check={{ pass: true, reason: 'Your result matches the expected result.', missing: [], extra: [] }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Correct!');
  });

  it('explains a failure and shows the difference on request', async () => {
    render(
      <CheckBanner
        check={{ pass: false, reason: '1 expected row(s) missing and 1 unexpected row(s).', expected: res([[1], [2]]), actual: res([[1], [3]]), missing: [[2]], extra: [[3]] }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Not quite.');
    await userEvent.click(screen.getByRole('button', { name: 'Show difference' }));
    const expected = screen.getByRole('region', { name: 'Expected result' });
    const mine = screen.getByRole('region', { name: 'Your result' });
    expect(expected.querySelector('.bg-ok-bg')).toHaveTextContent('2');
    expect(mine.querySelector('.bg-bad-bg')).toHaveTextContent('3');
  });

  it('has no difference button when there is nothing to compare', () => {
    render(<CheckBanner check={{ pass: false, reason: 'Your query failed: boom', missing: [], extra: [] }} />);
    expect(screen.queryByRole('button', { name: 'Show difference' })).not.toBeInTheDocument();
  });
});
```

`apps/web/src/components/SchemaViewer.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SchemaInfo } from '@codeadda/core';
import { SchemaViewer } from './SchemaViewer';

const schema: SchemaInfo = {
  tables: [
    {
      name: 'users', description: 'Customers', rowCount: 15, sampleQuery: 'SELECT * FROM users LIMIT 5;',
      columns: [{ name: 'id', type: 'integer', nullable: false, isPrimary: true, isForeign: false }],
    },
    {
      name: 'orders', description: 'Orders', rowCount: 25, sampleQuery: 'SELECT * FROM orders LIMIT 5;',
      columns: [{ name: 'user_id', type: 'integer', nullable: false, isPrimary: false, isForeign: true, references: 'users(id)' }],
    },
  ],
  relationships: [{ from: 'orders', column: 'user_id', to: 'users', toColumn: 'id' }],
};

describe('SchemaViewer', () => {
  it('expands the first table and lists relationships', () => {
    render(<SchemaViewer schema={schema} onSample={() => {}} />);
    expect(screen.getByRole('button', { name: /users/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('PK')).toBeInTheDocument();
    expect(screen.getByText('orders.user_id')).toBeInTheDocument();
  });

  it('shows FK details and requests sample data', async () => {
    const onSample = vi.fn();
    render(<SchemaViewer schema={schema} onSample={onSample} />);
    await userEvent.click(screen.getByRole('button', { name: /orders/ }));
    expect(screen.getByText('FK')).toBeInTheDocument();
    expect(screen.getByText('users(id)')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'View sample data' })[1]!);
    expect(onSample).toHaveBeenCalledWith(schema.tables[1]);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run apps/web/src/components`
Expected: the three new test files FAIL (modules missing); Sidebar still passes.

- [ ] **Step 3: Implement the components**

`apps/web/src/components/ResultTable.tsx`:
```tsx
import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

const MAX_ROWS = 1000;

function formatCell(v: unknown): ReactNode {
  if (v === null || v === undefined) return <span className="text-faint italic">NULL</span>;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

interface ResultTableProps {
  columns: string[];
  rows: unknown[][];
  highlight?: Set<number>;
  tone?: 'ok' | 'bad';
  label?: string;
}

export function ResultTable({ columns, rows, highlight, tone = 'ok', label = 'Query results' }: ResultTableProps) {
  const shown = rows.slice(0, MAX_ROWS);
  return (
    <div role="region" aria-label={label} tabIndex={0} className="max-h-[420px] overflow-auto rounded-md border border-line">
      <table className="w-full border-collapse font-mono text-sm">
        <thead className="sticky top-0 bg-subtle">
          <tr>
            {columns.map((c, i) => (
              <th key={i} scope="col" className="border-b border-line px-3 py-2 text-left text-xs font-semibold tracking-wide whitespace-nowrap text-muted uppercase">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row, r) => (
            <tr key={r} className={cx('border-b border-hair last:border-0', highlight?.has(r) && (tone === 'ok' ? 'bg-ok-bg' : 'bg-bad-bg'))}>
              {row.map((v, c) => (
                <td key={c} className={cx('px-3 py-1.5 whitespace-nowrap', typeof v === 'number' && 'text-right tabular-nums')}>
                  {formatCell(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > MAX_ROWS && (
        <p className="border-t border-line px-3 py-2 text-xs text-muted">
          Showing the first {MAX_ROWS} of {rows.length} rows.
        </p>
      )}
    </div>
  );
}
```

`apps/web/src/components/ResultsPanel.tsx`:
```tsx
import type { QueryResult } from '@codeadda/core';
import { ResultTable } from './ResultTable';

export function ResultsPanel({ result, running }: { result?: QueryResult; running: boolean }) {
  if (running) return <p className="text-sm text-muted">Running…</p>;
  if (!result) return <p className="text-sm text-muted">Run a query to see results</p>;
  if (!result.ok) {
    return (
      <div role="alert" className="rounded-md border border-bad-line bg-bad-bg p-3 text-sm text-bad">
        <p className="font-semibold">Error{result.error.code ? ` ${result.error.code}` : ''}</p>
        <pre className="mt-1 font-mono whitespace-pre-wrap">{result.error.message}</pre>
        {result.error.position !== undefined && <p className="mt-1 text-xs">At character {result.error.position}</p>}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {result.notice && (
        <p role="status" className="rounded-md border border-note-line bg-note-bg px-3 py-2 text-sm text-note">
          {result.notice}
        </p>
      )}
      {result.columns.length > 0 && <ResultTable columns={result.columns} rows={result.rows} />}
      <p className="text-xs text-muted">
        {result.rowCount} {result.rowCount === 1 ? 'row' : 'rows'} · {result.durationMs} ms
      </p>
    </div>
  );
}
```

`apps/web/src/components/CheckBanner.tsx`:
```tsx
import { useState } from 'react';
import { markRows, type CheckResult } from '@codeadda/core';
import { ResultTable } from './ResultTable';

export function CheckBanner({ check }: { check: CheckResult }) {
  const [showDiff, setShowDiff] = useState(false);

  if (check.pass) {
    return (
      <div role="status" className="rounded-md border border-ok-line bg-ok-bg px-4 py-3 text-sm text-ok">
        <strong>Correct!</strong> {check.reason}
      </div>
    );
  }

  const { expected, actual } = check;
  return (
    <div className="space-y-3">
      <div role="status" className="rounded-md border border-warn-line bg-warn-bg px-4 py-3 text-sm text-warn">
        <p>
          <strong>Not quite.</strong> {check.reason}
        </p>
        {expected && actual && (
          <button type="button" aria-expanded={showDiff} onClick={() => setShowDiff((s) => !s)} className="mt-2 text-xs font-semibold underline">
            {showDiff ? 'Hide difference' : 'Show difference'}
          </button>
        )}
      </div>
      {showDiff && expected && actual && (
        <div className="grid gap-4 lab:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Expected</h3>
            <ResultTable label="Expected result" columns={expected.columns} rows={expected.rows} highlight={markRows(expected.rows, check.missing)} tone="ok" />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Your result</h3>
            <ResultTable label="Your result" columns={actual.columns} rows={actual.rows} highlight={markRows(actual.rows, check.extra)} tone="bad" />
          </div>
        </div>
      )}
    </div>
  );
}
```

`apps/web/src/components/SchemaViewer.tsx`:
```tsx
import { useState } from 'react';
import type { SchemaInfo, TableInfo } from '@codeadda/core';
import { cx } from '../lib/cx';

function Badge({ children, tone }: { children: string; tone: 'brand' | 'note' }) {
  return (
    <span className={cx('mr-1 rounded px-1.5 py-0.5 text-xs font-semibold', tone === 'brand' ? 'bg-brand-muted text-brand' : 'bg-note-bg text-note')}>
      {children}
    </span>
  );
}

export function SchemaViewer({ schema, onSample }: { schema?: SchemaInfo; onSample: (t: TableInfo) => void }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  if (!schema) return <p className="text-sm text-muted">Loading schema…</p>;
  if (schema.tables.length === 0) return <p className="text-sm text-muted">There are no tables yet.</p>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Database schema</h3>
        <p className="text-sm text-muted">Explore the tables and their structure</p>
      </div>
      <div className="space-y-2">
        {schema.tables.map((t, idx) => {
          const isOpen = open[t.name] ?? idx === 0;
          return (
            <section key={t.name} className="rounded-lg border border-line bg-surface">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen((o) => ({ ...o, [t.name]: !isOpen }))}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className="font-mono font-semibold">{t.name}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-muted">{t.description}</span>
                <span className="shrink-0 text-xs text-faint">{t.rowCount} rows</span>
                <span aria-hidden="true" className={cx('text-faint transition-transform', isOpen && 'rotate-180')}>
                  ▾
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-line px-4 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs tracking-wide text-muted uppercase">
                        <th className="py-1 pr-3 font-semibold">Column</th>
                        <th className="py-1 pr-3 font-semibold">Type</th>
                        <th className="py-1 pr-3 font-semibold">Key</th>
                        <th className="py-1 font-semibold">References</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.columns.map((c) => (
                        <tr key={c.name} className="border-t border-hair">
                          <td className="py-1.5 pr-3 font-mono">{c.name}</td>
                          <td className="py-1.5 pr-3 font-mono text-muted">
                            {c.type}
                            {c.nullable ? '' : ' not null'}
                          </td>
                          <td className="py-1.5 pr-3">
                            {c.isPrimary && <Badge tone="brand">PK</Badge>}
                            {c.isForeign && <Badge tone="note">FK</Badge>}
                          </td>
                          <td className="py-1.5 font-mono text-muted">{c.references ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    type="button"
                    onClick={() => onSample(t)}
                    className="mt-3 rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:bg-hover hover:text-ink"
                  >
                    View sample data
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </div>
      {schema.relationships.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Table relationships</h3>
          <ul className="space-y-1 text-sm">
            {schema.relationships.map((r) => (
              <li key={`${r.from}.${r.column}`}>
                <code className="font-mono">
                  {r.from}.{r.column}
                </code>{' '}
                →{' '}
                <code className="font-mono">
                  {r.to}.{r.toColumn}
                </code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run apps/web/src/components && npm run typecheck`
Expected: PASS, no type errors.

---

### Task 11: Editor, hints, solution, engine hook and the full lesson page

**Files:**
- Create: `apps/web/src/components/QueryEditor.tsx`, `HintToggle.tsx`, `SolutionPanel.tsx`, `ErrorScreen.tsx`
- Create: `apps/web/src/lab/useLabEngine.ts`, `apps/web/src/lab/LessonFlow.tsx`
- Modify: `apps/web/src/lab/LabRoute.tsx` (the `LabView` function only)
- Test: `apps/web/src/lab/useLabEngine.test.tsx`, `apps/web/src/components/HintToggle.test.tsx`, `apps/web/src/components/SolutionPanel.test.tsx`

**Interfaces:**
- Consumes: everything above; `createEngine` (Task 7); `grade`, `resolveDataset`, `CheckResult` (Task 2); `ProgressStore`, `progressStore` (Task 8); components from Tasks 9–10.
- Produces: `interface LabEngine { status: 'loading' | 'ready' | 'error'; error?: string; schema?: SchemaInfo; result?: QueryResult; check?: CheckResult; running: boolean; runId: number; run(query: string): Promise<void>; reset(): Promise<void>; sample(t: TableInfo): Promise<void>; retry(): void }`; `useLabEngine(lab: Lab, item: LessonItem, opts?: { createEngine?: (l: LabLanguage) => Engine; progress?: ProgressStore }): LabEngine`; `STARTER_SQL = '-- Write your SQL query here\n'`.

Behaviour of `useLabEngine`:
- Creates a **main** engine and a **grader** engine per lab; disposes both on unmount.
- When the item's dataset changes (by name + length), sets up the main engine and loads the schema; stale loads are ignored.
- `run(query)`: runs on main; if OK, grades on the grader; marks the item complete on a pass; appends `You changed the database structure — use Reset DB to restore the lesson data.` to the notice when the query contains `DROP`, `TRUNCATE` or `ALTER`; refreshes the schema after a successful run.
- `reset()`: resets main, refreshes schema, shows notice `Database reset to the lesson data.`, clears the check.
- `sample(table)`: runs `table.sampleQuery` on main and shows it; no check.

- [ ] **Step 1: Write the failing hook test**

`apps/web/src/lab/useLabEngine.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Engine, Lab, LessonItem, QueryResult } from '@codeadda/core';
import { createProgressStore } from '../state/progress';
import { memoryStorage } from '../state/storage';
import { useLabEngine } from './useLabEngine';

const item: LessonItem = {
  kind: 'lesson', id: 'one', title: 'One', chapter: 'Basics', order: 1, dataset: 'tiny', check: 'rows-unordered',
  body: '', task: '', hints: [], solution: 'SELECT 1', path: 'x.md',
};
const lab: Lab = {
  id: 'demo', title: 'Demo', subtitle: '', language: 'sql', errors: [], problems: [],
  lessons: [{ title: 'Basics', items: [item] }], datasets: { tiny: 'CREATE TABLE t (n int);' },
};

function fakeFactory(opts: { failSetup?: boolean } = {}) {
  const created: Engine[] = [];
  const factory = (): Engine => {
    const engine: Engine = {
      kind: 'sql',
      mode: 'browser',
      setup: vi.fn(async () => {
        if (opts.failSetup) throw new Error('bad dataset');
      }),
      run: vi.fn(async (q: string): Promise<QueryResult> =>
        q.includes('BROKEN')
          ? { ok: false, error: { message: 'syntax error' } }
          : { ok: true, columns: ['n'], rows: [[q.includes('2') ? 2 : 1]], rowCount: 1, durationMs: 1 },
      ),
      reset: vi.fn(async () => {}),
      snapshot: vi.fn(),
      describe: vi.fn(async () => ({ tables: [], relationships: [] })),
      dispose: vi.fn(async () => {}),
    };
    created.push(engine);
    return engine;
  };
  return { factory, created };
}

describe('useLabEngine', () => {
  it('loads the dataset, runs, checks and records completion', async () => {
    const { factory } = fakeFactory();
    const progress = createProgressStore(memoryStorage());
    const { result } = renderHook(() => useLabEngine(lab, item, { createEngine: factory, progress }));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => {
      await result.current.run('SELECT 1');
    });
    expect(result.current.result?.ok).toBe(true);
    expect(result.current.check?.pass).toBe(true);
    expect(progress.isComplete('demo', 'one')).toBe(true);
  });

  it('shows a wrong answer without completing the lesson', async () => {
    const { factory } = fakeFactory();
    const progress = createProgressStore(memoryStorage());
    const { result } = renderHook(() => useLabEngine(lab, item, { createEngine: factory, progress }));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => {
      await result.current.run('SELECT 2');
    });
    expect(result.current.check?.pass).toBe(false);
    expect(progress.isComplete('demo', 'one')).toBe(false);
  });

  it('does not check a failing query', async () => {
    const { factory } = fakeFactory();
    const { result } = renderHook(() => useLabEngine(lab, item, { createEngine: factory, progress: createProgressStore(memoryStorage()) }));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => {
      await result.current.run('BROKEN');
    });
    expect(result.current.result).toEqual({ ok: false, error: { message: 'syntax error' } });
    expect(result.current.check).toBeUndefined();
  });

  it('adds a reset hint after destructive queries and resets on request', async () => {
    const { factory, created } = fakeFactory();
    const { result } = renderHook(() => useLabEngine(lab, item, { createEngine: factory, progress: createProgressStore(memoryStorage()) }));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => {
      await result.current.run('DROP TABLE t');
    });
    expect(result.current.result?.ok && result.current.result.notice).toMatch(/use Reset DB/);
    await act(async () => {
      await result.current.reset();
    });
    expect(created[0]!.reset).toHaveBeenCalled();
    expect(result.current.result?.ok && result.current.result.notice).toBe('Database reset to the lesson data.');
  });

  it('reports a dataset that fails to load and retries', async () => {
    const { factory } = fakeFactory({ failSetup: true });
    const { result } = renderHook(() => useLabEngine(lab, item, { createEngine: factory, progress: createProgressStore(memoryStorage()) }));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('bad dataset');
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('disposes both engines on unmount', async () => {
    const { factory, created } = fakeFactory();
    const { result, unmount } = renderHook(() => useLabEngine(lab, item, { createEngine: factory, progress: createProgressStore(memoryStorage()) }));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    unmount();
    expect(created.every((e) => (e.dispose as ReturnType<typeof vi.fn>).mock.calls.length === 1)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run apps/web/src/lab/useLabEngine.test.tsx`
Expected: FAIL — cannot resolve `./useLabEngine`.

- [ ] **Step 3: Implement the hook**

`apps/web/src/lab/useLabEngine.ts`:
```ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  grade,
  resolveDataset,
  type CheckResult,
  type Engine,
  type Lab,
  type LabLanguage,
  type LessonItem,
  type QueryResult,
  type SchemaInfo,
  type TableInfo,
} from '@codeadda/core';
import { createEngine as defaultCreateEngine } from '../engine/createEngine';
import { progressStore, type ProgressStore } from '../state/progress';

export const STARTER_SQL = '-- Write your SQL query here\n';
const DESTRUCTIVE = /\b(drop|truncate|alter)\b/i;
const RESET_HINT = 'You changed the database structure — use Reset DB to restore the lesson data.';

export interface LabEngine {
  status: 'loading' | 'ready' | 'error';
  error?: string;
  schema?: SchemaInfo;
  result?: QueryResult;
  check?: CheckResult;
  running: boolean;
  runId: number;
  run(query: string): Promise<void>;
  reset(): Promise<void>;
  sample(t: TableInfo): Promise<void>;
  retry(): void;
}

type State = Omit<LabEngine, 'run' | 'reset' | 'sample' | 'retry'>;

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function useLabEngine(
  lab: Lab,
  item: LessonItem,
  opts: { createEngine?: (l: LabLanguage) => Engine; progress?: ProgressStore } = {},
): LabEngine {
  const make = opts.createEngine ?? defaultCreateEngine;
  const progress = opts.progress ?? progressStore;
  const engines = useRef<{ main: Engine; grader: Engine } | null>(null);
  const loaded = useRef<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<State>({ status: 'loading', running: false, runId: 0 });
  const dataset = useMemo(() => resolveDataset(lab, item), [lab, item]);

  useEffect(() => {
    const main = make(lab.language);
    const grader = make(lab.language);
    engines.current = { main, grader };
    loaded.current = null;
    return () => {
      engines.current = null;
      void main.dispose();
      void grader.dispose();
    };
  }, [lab.language, make]);

  useEffect(() => {
    const e = engines.current;
    if (!e) return;
    let cancelled = false;
    const key = `${dataset.name}:${dataset.source.length}`;
    setState((s) => ({ ...s, result: undefined, check: undefined }));
    if (loaded.current === key) return;
    setState((s) => ({ ...s, status: 'loading', error: undefined }));
    (async () => {
      try {
        await e.main.setup(dataset);
        const schema = await e.main.describe();
        if (cancelled) return;
        loaded.current = key;
        setState((s) => ({ ...s, status: 'ready', schema }));
      } catch (err) {
        if (!cancelled) setState((s) => ({ ...s, status: 'error', error: message(err) }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataset, reloadKey]);

  const run = useCallback(
    async (query: string) => {
      const e = engines.current;
      if (!e) return;
      setState((s) => ({ ...s, running: true, check: undefined }));
      let result = await e.main.run(query);
      let check: CheckResult | undefined;
      let schema: SchemaInfo | undefined;
      if (result.ok) {
        if (DESTRUCTIVE.test(query)) result = { ...result, notice: result.notice ? `${result.notice} ${RESET_HINT}` : RESET_HINT };
        try {
          check = await grade(e.grader, item, dataset, query);
          if (check.pass) progress.markComplete(lab.id, item.id);
        } catch (err) {
          check = { pass: false, reason: `Could not check this answer: ${message(err)}`, missing: [], extra: [] };
        }
        schema = await e.main.describe().catch(() => undefined);
      }
      setState((s) => ({ ...s, running: false, result, check, schema: schema ?? s.schema, runId: s.runId + 1 }));
    },
    [lab.id, item, dataset, progress],
  );

  const reset = useCallback(async () => {
    const e = engines.current;
    if (!e) return;
    setState((s) => ({ ...s, running: true }));
    try {
      await e.main.reset();
      const schema = await e.main.describe();
      setState((s) => ({
        ...s,
        running: false,
        schema,
        check: undefined,
        result: { ok: true, columns: [], rows: [], rowCount: 0, durationMs: 0, notice: 'Database reset to the lesson data.' },
        runId: s.runId + 1,
      }));
    } catch (err) {
      setState((s) => ({ ...s, running: false, result: { ok: false, error: { message: message(err) } } }));
    }
  }, []);

  const sample = useCallback(async (t: TableInfo) => {
    const e = engines.current;
    if (!e) return;
    setState((s) => ({ ...s, running: true }));
    const result = await e.main.run(t.sampleQuery);
    setState((s) => ({ ...s, running: false, result, check: undefined, runId: s.runId + 1 }));
  }, []);

  const retry = useCallback(() => {
    loaded.current = null;
    setReloadKey((k) => k + 1);
  }, []);

  return { ...state, run, reset, sample, retry };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run apps/web/src/lab/useLabEngine.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write failing tests for HintToggle and SolutionPanel**

`apps/web/src/components/HintToggle.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HintToggle } from './HintToggle';

describe('HintToggle', () => {
  it('reveals and hides hints', async () => {
    render(<HintToggle hints={['Use WHERE.', 'Quote text.']} />);
    expect(screen.queryByText('Use WHERE.')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show hint' }));
    expect(screen.getByText('Use WHERE.')).toBeInTheDocument();
    expect(screen.getByText('Quote text.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hide hint' }));
    expect(screen.queryByText('Use WHERE.')).not.toBeInTheDocument();
  });

  it('renders nothing without hints', () => {
    const { container } = render(<HintToggle hints={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

`apps/web/src/components/SolutionPanel.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SolutionPanel } from './SolutionPanel';

describe('SolutionPanel', () => {
  it('is collapsed until opened, then loads the solution into the editor', async () => {
    const onLoad = vi.fn();
    render(<SolutionPanel solution="SELECT 1;" onLoad={onLoad} />);
    expect(screen.queryByText('SELECT 1;')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Solution/ }));
    expect(screen.getByText('SELECT 1;')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Load into editor' }));
    expect(onLoad).toHaveBeenCalledWith('SELECT 1;');
  });
});
```

Run: `npx vitest run apps/web/src/components/HintToggle.test.tsx apps/web/src/components/SolutionPanel.test.tsx` → FAIL (modules missing).

- [ ] **Step 6: Implement HintToggle, SolutionPanel, ErrorScreen, QueryEditor**

`apps/web/src/components/HintToggle.tsx`:
```tsx
import { useState } from 'react';
import { Markdown } from './Markdown';

export function HintToggle({ hints }: { hints: string[] }) {
  const [open, setOpen] = useState(false);
  if (hints.length === 0) return null;
  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:bg-hover hover:text-ink"
      >
        {open ? 'Hide hint' : 'Show hint'}
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-md border border-brand-line bg-brand-muted px-4 py-3 text-sm">
          {hints.map((h, i) => (
            <Markdown key={i}>{h}</Markdown>
          ))}
        </div>
      )}
    </div>
  );
}
```

`apps/web/src/components/SolutionPanel.tsx`:
```tsx
import { useState } from 'react';
import { cx } from '../lib/cx';

export function SolutionPanel({ solution, onLoad }: { solution: string; onLoad: (sql: string) => void }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(solution);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-lg border border-line bg-surface">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm">
        <span aria-hidden="true" className={cx('inline-block text-faint transition-transform', open && 'rotate-90')}>
          ›
        </span>
        <span className="font-semibold">Solution</span>
        <span className="text-muted">stuck? see the expected query</span>
      </button>
      {open && (
        <div className="border-t border-line px-4 py-3">
          <pre className="overflow-x-auto rounded-md bg-subtle p-3 font-mono text-sm">
            <code>{solution}</code>
          </pre>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={copy} className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:bg-hover hover:text-ink">
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={() => onLoad(solution)}
              className="rounded-md bg-inverse px-3 py-1.5 text-sm font-semibold text-on-inverse shadow-soft"
            >
              Load into editor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

`apps/web/src/components/ErrorScreen.tsx`:
```tsx
export function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-bad-line bg-bad-bg p-5 text-bad">
      <p className="font-semibold">Could not load the lab database</p>
      <pre className="mt-2 font-mono text-sm whitespace-pre-wrap">{message}</pre>
      <button type="button" onClick={onRetry} className="mt-4 rounded-md bg-inverse px-4 py-2 text-sm font-semibold text-on-inverse">
        Retry
      </button>
    </div>
  );
}
```

`apps/web/src/components/QueryEditor.tsx`:
```tsx
import { useEffect, useRef } from 'react';
import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import type { Theme } from '../state/prefs';

// Monaco needs hex colours; these mirror tokens.css.
const defineThemes: BeforeMount = (monaco) => {
  monaco.editor.defineTheme('codeadda-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#1c1917',
      'editorLineNumber.foreground': '#a8a29e',
      'editor.lineHighlightBackground': '#faf7f2',
      'editorCursor.foreground': '#f97316',
      'editor.selectionBackground': '#fed7aa',
    },
  });
  monaco.editor.defineTheme('codeadda-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#181716',
      'editor.foreground': '#f5f2ed',
      'editorLineNumber.foreground': '#6b6560',
      'editor.lineHighlightBackground': '#1f1d1b',
      'editorCursor.foreground': '#fb923c',
      'editor.selectionBackground': '#7c2d12',
    },
  });
};

interface QueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  disabled: boolean;
  running: boolean;
  fontScale: number;
  theme: Theme;
  statusText?: string;
  language?: string;
  title?: string;
}

export function QueryEditor({ value, onChange, onRun, disabled, running, fontScale, theme, statusText, language = 'sql', title = 'SQL editor' }: QueryEditorProps) {
  const runRef = useRef(onRun);
  useEffect(() => {
    runRef.current = disabled || running ? () => {} : onRun;
  });

  const onMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current());
  };

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex items-center gap-3 border-b border-line px-4 py-2">
        <span className="text-xs font-semibold tracking-wide text-muted uppercase">{title}</span>
        {statusText && <span className="text-xs text-faint">{statusText}</span>}
        <kbd className="ml-auto hidden text-xs text-faint lab:inline">Ctrl/⌘ + Enter</kbd>
        <button
          type="button"
          onClick={onRun}
          disabled={disabled || running}
          className="rounded-md bg-inverse px-4 py-1.5 text-sm font-semibold text-on-inverse shadow-soft transition-opacity disabled:opacity-50 max-lab:ml-auto"
        >
          {running ? 'Running…' : 'Run'}
        </button>
      </div>
      <div data-testid="query-editor">
        <Editor
          height="220px"
          language={language}
          theme={theme === 'dark' ? 'codeadda-dark' : 'codeadda-light'}
          value={value}
          onChange={(v) => onChange(v ?? '')}
          beforeMount={defineThemes}
          onMount={onMount}
          loading={<p className="p-4 text-sm text-muted">Loading editor…</p>}
          options={{
            minimap: { enabled: false },
            fontSize: Math.round(14 * fontScale),
            fontFamily: "'JetBrains Mono Variable', ui-monospace, monospace",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            tabSize: 2,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
}
```

Run: `npx vitest run apps/web/src/components` → PASS.

- [ ] **Step 7: Implement LessonFlow**

`apps/web/src/lab/LessonFlow.tsx`:
```tsx
import { useEffect, useState } from 'react';
import type { Lab, LessonItem } from '@codeadda/core';
import { CheckBanner } from '../components/CheckBanner';
import { ErrorScreen } from '../components/ErrorScreen';
import { HintToggle } from '../components/HintToggle';
import { LessonHeader } from '../components/LessonHeader';
import { Markdown } from '../components/Markdown';
import { QueryEditor } from '../components/QueryEditor';
import { ResultsPanel } from '../components/ResultsPanel';
import { SchemaViewer } from '../components/SchemaViewer';
import { SolutionPanel } from '../components/SolutionPanel';
import { cx } from '../lib/cx';
import { usePrefs } from '../state/prefs';
import { progressStore } from '../state/progress';
import type { Tab } from './navigation';
import { STARTER_SQL, type LabEngine } from './useLabEngine';

interface LessonFlowProps {
  lab: Lab;
  tab: Tab;
  item: LessonItem;
  number: number;
  engine: LabEngine;
}

export function LessonFlow({ lab, tab, item, number, engine }: LessonFlowProps) {
  const prefs = usePrefs();
  const [query, setQuery] = useState(() => progressStore.getDraft(lab.id, item.id) ?? STARTER_SQL);
  const [panel, setPanel] = useState<'results' | 'schema'>('results');

  useEffect(() => {
    const t = setTimeout(() => progressStore.saveDraft(lab.id, item.id, query), 400);
    return () => clearTimeout(t);
  }, [lab.id, item.id, query]);

  const run = () => {
    setPanel('results');
    void engine.run(query);
  };

  return (
    <div className="space-y-5">
      <LessonHeader tab={tab} item={item} number={number} />

      <section aria-labelledby="your-turn" className="rounded-lg border border-line bg-surface p-4">
        <h2 id="your-turn" className="text-xs font-semibold tracking-wide text-brand uppercase">
          Your turn
        </h2>
        <Markdown className="mt-2">{item.task}</Markdown>
        <HintToggle hints={item.hints} />
      </section>

      {engine.status === 'error' ? (
        <ErrorScreen message={engine.error ?? 'Unknown error'} onRetry={engine.retry} />
      ) : (
        <>
          <QueryEditor
            value={query}
            onChange={setQuery}
            onRun={run}
            disabled={engine.status !== 'ready'}
            running={engine.running}
            fontScale={prefs.fontScale}
            theme={prefs.theme}
            statusText={engine.status === 'loading' ? 'Loading database…' : undefined}
          />
          <SolutionPanel solution={item.solution} onLoad={setQuery} />
          {engine.check && <CheckBanner key={engine.runId} check={engine.check} />}
          <div className="rounded-lg border border-line bg-surface">
            <div role="tablist" aria-label="Output" className="flex gap-1 border-b border-line px-2 pt-2">
              {(
                [
                  ['results', 'Query Results'],
                  ['schema', 'Schema'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={panel === id}
                  onClick={() => setPanel(id)}
                  className={cx(
                    '-mb-px rounded-t-md border-b-2 px-3 py-2 text-sm font-medium',
                    panel === id ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="p-4">
              {panel === 'results' ? (
                <ResultsPanel result={engine.result} running={engine.running} />
              ) : (
                <SchemaViewer
                  schema={engine.schema}
                  onSample={(t) => {
                    setPanel('results');
                    void engine.sample(t);
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Wire LessonFlow and Reset into `LabView`**

In `apps/web/src/lab/LabRoute.tsx`, replace the imports block and the whole `LabView` function with:
```tsx
import { useState } from 'react';
import { Navigate, useParams } from 'react-router';
import type { Lab, LessonItem } from '@codeadda/core';
import { getLab } from '../content/registry';
import { LabHeader } from '../components/LabHeader';
import { NotFound } from '../components/NotFound';
import { Sidebar } from '../components/Sidebar';
import { prefsStore, usePrefs } from '../state/prefs';
import { useProgress } from '../state/progress';
import { LessonFlow } from './LessonFlow';
import { flatItems, itemPath, numberOf, type Tab } from './navigation';
import { useLabEngine } from './useLabEngine';
```
```tsx
export function LabView({ lab, tab, item }: { lab: Lab; tab: Tab; item: LessonItem }) {
  const prefs = usePrefs();
  const progress = useProgress();
  const engine = useLabEngine(lab, item);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-[calc(100dvh_-_var(--navbar-height))] flex-col">
      <LabHeader
        lab={lab}
        tab={tab}
        onOpenDrawer={() => setDrawerOpen(true)}
        onReset={() => void engine.reset()}
        resetDisabled={engine.status !== 'ready' || engine.running}
      />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar
          lab={lab}
          tab={tab}
          activeId={item.id}
          collapsed={prefs.sidebarCollapsed}
          onToggleCollapsed={() => prefsStore.set({ sidebarCollapsed: !prefs.sidebarCollapsed })}
          drawerOpen={drawerOpen}
          onCloseDrawer={() => setDrawerOpen(false)}
          isComplete={(id) => progress.isComplete(lab.id, id)}
        />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1100px] px-4 py-6 lab:px-8">
            <LessonFlow key={item.id} lab={lab} tab={tab} item={item} number={numberOf(lab, tab, item.id)} engine={engine} />
          </div>
        </main>
      </div>
    </div>
  );
}
```
(`LessonHeader` is now rendered inside `LessonFlow`; the import is removed from this file.)

- [ ] **Step 9: Verify in the browser**

Run: `npm run dev`, open `http://localhost:5173`.
Expected, in order:
1. "Loading database…" appears briefly, then **Run** becomes enabled.
2. Type `SELECT * FROM users;` → Run (or Ctrl/⌘+Enter) → 15 rows; NULL phones shown as italic `NULL`; a green **Correct!** banner; a ✓ next to lesson 1 in the sidebar.
3. Type `SELECT name FROM users;` → **Not quite.** with a column message; **Show difference** shows Expected vs Your result side by side.
4. Type `SELECT * FORM users;` → red error box with `syntax error at or near "FORM"`.
5. **Show hint**, **Solution → Load into editor** work.
6. Schema tab → 8 tables with PK/FK badges, "users" expanded; **View sample data** on `orders` shows 5 rows in Query Results.
7. `DROP TABLE reviews;` → notice suggesting Reset DB; **Reset DB** → "Database reset to the lesson data."; Schema shows `reviews` again.
8. `WITH RECURSIVE r(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM r) SELECT count(*) FROM r;` → after ~5 s "Query timed out…" and the lab still works.
9. Switch theme → the editor switches between light and dark themes.
10. Reload the page → your last query for the lesson is still in the editor.

- [ ] **Step 10: Typecheck and all tests**

Run: `npm run typecheck && npm test`
Expected: all pass.

---

### Task 12: SQL lesson content — chapters 2 to 6

**Files:**
- Create: 30 lesson files under `content/sql/lessons/02-sorting/` … `06-subqueries/` (paths below).

**Interfaces:**
- Consumes: the lesson format (Task 3), the `shop` dataset and the chapter-1 files as the model (Task 5).
- Produces: lessons 6–35.

**Authoring rules (apply to every lesson in Tasks 12–14):**
- Front-matter exactly as specified in each block (`id`, `title`, `chapter`, `order`, `dataset: shop`, `check`, and `checkQuery` when given).
- Explanation: 2–4 short paragraphs in your own words that teach the concept, with **one small example on a different table or column than the task**, so the example is not the answer.
- `## Task`: one or two sentences that name every required column (and alias) and any required order, so there is exactly one correct result shape.
- `## Hint`: 1–2 bullets, from gentle to specific; never paste the full solution.
- `## Solution`: exactly the SQL given below.
- Original wording only.

- [ ] **Step 1: Chapter "Sorting Data" (`lessons/02-sorting/`)**

| File | id | title | order | check | Task must ask for | Solution |
|---|---|---|---|---|---|---|
| `01-order-asc.md` | `order-asc` | Sorting with ORDER BY | 1 | rows-ordered | product `name`, `price`, cheapest first | `SELECT name, price FROM products ORDER BY price ASC;` |
| `02-order-desc.md` | `order-desc` | Sorting in Descending Order | 2 | rows-ordered | user `name`, `age`, oldest first | `SELECT name, age FROM users ORDER BY age DESC;` |
| `03-order-multi.md` | `order-multi` | Sorting by Several Columns | 3 | rows-ordered | user `name`, `country`, `age`; country A→Z, then oldest first within a country | `SELECT name, country, age FROM users ORDER BY country ASC, age DESC;` |
| `04-nulls-last.md` | `nulls-last` | Where NULLs Go When Sorting | 4 | rows-ordered | user `name`, `phone` sorted by phone, users without a phone last, ties by name | `SELECT name, phone FROM users ORDER BY phone ASC NULLS LAST, name ASC;` |

- [ ] **Step 2: Chapter "Filtering Data" (`lessons/03-filtering/`)** — all `rows-unordered`

| File | id | title | order | Task must ask for | Solution |
|---|---|---|---|---|---|
| `01-where.md` | `where` | Filtering Rows with WHERE | 1 | all columns of users from India | `SELECT * FROM users WHERE country = 'India';` |
| `02-comparison.md` | `comparison` | Comparison Operators | 2 | `name`, `price` of products costing more than 50 | `SELECT name, price FROM products WHERE price > 50;` |
| `03-and.md` | `and` | Combining Conditions with AND | 3 | `name`, `price` of products in category 1 cheaper than 100 | `SELECT name, price FROM products WHERE category_id = 1 AND price < 100;` |
| `04-or.md` | `or` | Either Condition with OR | 4 | `name`, `country` of users from the USA or Japan | `SELECT name, country FROM users WHERE country = 'USA' OR country = 'Japan';` |
| `05-in.md` | `in` | Matching a List with IN | 5 | `name`, `country` of users from India, France or Spain | `SELECT name, country FROM users WHERE country IN ('India', 'France', 'Spain');` |
| `06-not-in.md` | `not-in` | Excluding a List with NOT IN | 6 | `name`, `category_id` of products not in categories 1 or 2 | `SELECT name, category_id FROM products WHERE category_id NOT IN (1, 2);` |
| `07-between.md` | `between` | Ranges with BETWEEN | 7 | `id`, `order_date` of orders placed in February 2024 | `SELECT id, order_date FROM orders WHERE order_date BETWEEN '2024-02-01' AND '2024-02-29';` |
| `08-like.md` | `like` | Pattern Matching with LIKE | 8 | `name`, `email` of users whose name starts with "A" | `SELECT name, email FROM users WHERE name LIKE 'A%';` |
| `09-is-null.md` | `is-null` | Finding Missing Values with IS NULL | 9 | `name`, `email` of users with no phone number | `SELECT name, email FROM users WHERE phone IS NULL;` |
| `10-is-not-null.md` | `is-not-null` | Keeping Known Values with IS NOT NULL | 10 | `name`, `description` of products that have a description | `SELECT name, description FROM products WHERE description IS NOT NULL;` |

The IS NULL lesson must explain why `phone = NULL` never matches.

- [ ] **Step 3: Chapter "Joining Tables" (`lessons/04-joins/`)** — all `rows-unordered`

| File | id | title | order | Task must ask for | Solution |
|---|---|---|---|---|---|
| `01-table-aliases.md` | `table-aliases` | Short Names with Table Aliases | 1 | using the alias `p`, `name` and `stock` of products that are out of stock | `SELECT p.name, p.stock FROM products AS p WHERE p.stock = 0;` |
| `02-inner-join.md` | `inner-join` | Matching Rows with INNER JOIN | 2 | each order's `id` and the customer's name as `customer` | `SELECT o.id, u.name AS customer FROM orders AS o INNER JOIN users AS u ON u.id = o.user_id;` |
| `03-left-join.md` | `left-join` | Keeping Every Row with LEFT JOIN | 3 | every employee as `employee` with their department as `department`, including employees with no department | `SELECT e.name AS employee, d.name AS department FROM employees AS e LEFT JOIN departments AS d ON d.id = e.department_id;` |
| `04-right-join.md` | `right-join` | RIGHT JOIN | 4 | every department as `department` with its employees as `employee`, including departments with nobody | `SELECT d.name AS department, e.name AS employee FROM employees AS e RIGHT JOIN departments AS d ON d.id = e.department_id;` |
| `05-self-join.md` | `self-join` | Joining a Table to Itself | 5 | `employee` and `manager` names for employees who have a manager | `SELECT e.name AS employee, m.name AS manager FROM employees AS e JOIN employees AS m ON m.id = e.manager_id;` |
| `06-multi-join.md` | `multi-join` | Joining Three Tables | 6 | order `id`, `customer` name and `product` name | `SELECT o.id, u.name AS customer, p.name AS product FROM orders AS o JOIN users AS u ON u.id = o.user_id JOIN products AS p ON p.id = o.product_id;` |
| `07-join-where.md` | `join-where` | Filtering Joined Rows | 7 | order `id`, `customer`, `product` for customers in India only | `SELECT o.id, u.name AS customer, p.name AS product FROM orders AS o JOIN users AS u ON u.id = o.user_id JOIN products AS p ON p.id = o.product_id WHERE u.country = 'India';` |

- [ ] **Step 4: Chapter "Grouping Data" (`lessons/05-grouping/`)** — all `rows-unordered`

| File | id | title | order | Task must ask for | Solution |
|---|---|---|---|---|---|
| `01-count.md` | `count` | Counting Rows with COUNT | 1 | the number of users as `total_users` | `SELECT COUNT(*) AS total_users FROM users;` |
| `02-sum.md` | `sum` | Adding Up with SUM | 2 | total quantity over all orders as `total_items` | `SELECT SUM(quantity) AS total_items FROM orders;` |
| `03-avg.md` | `avg` | Averages with AVG | 3 | average product price rounded to 2 decimals as `avg_price` | `SELECT ROUND(AVG(price), 2) AS avg_price FROM products;` |
| `04-min-max.md` | `min-max` | Smallest and Largest with MIN and MAX | 4 | lowest price as `cheapest`, highest as `priciest` | `SELECT MIN(price) AS cheapest, MAX(price) AS priciest FROM products;` |
| `05-group-by.md` | `group-by` | Grouping with GROUP BY | 5 | each `country` with its number of users as `users` | `SELECT country, COUNT(*) AS users FROM users GROUP BY country;` |
| `06-having.md` | `having` | Filtering Groups with HAVING | 6 | countries with more than 2 users: `country`, `users` | `SELECT country, COUNT(*) AS users FROM users GROUP BY country HAVING COUNT(*) > 2;` |

The HAVING lesson must explain WHERE (before grouping) vs HAVING (after grouping).

- [ ] **Step 5: Chapter "Subqueries" (`lessons/06-subqueries/`)** — all `rows-unordered`

| File | id | title | order | Task must ask for | Solution |
|---|---|---|---|---|---|
| `01-subquery-where.md` | `subquery-where` | Subqueries in WHERE | 1 | `name`, `price` of products priced above the average price | `SELECT name, price FROM products WHERE price > (SELECT AVG(price) FROM products);` |
| `02-subquery-from.md` | `subquery-from` | Subqueries in FROM | 2 | the average number of orders per customer who ordered, rounded to 2 decimals, as `avg_orders` | `SELECT ROUND(AVG(order_count), 2) AS avg_orders FROM (SELECT user_id, COUNT(*) AS order_count FROM orders GROUP BY user_id) AS per_user;` |
| `03-exists.md` | `exists` | Checking for Rows with EXISTS | 3 | `name` of every user who has placed at least one order | `SELECT u.name FROM users AS u WHERE EXISTS (SELECT 1 FROM orders AS o WHERE o.user_id = u.id);` |

- [ ] **Step 6: Verify the content**

Run: `npm run check-content`
Expected: `✓ sql: 35 item(s) checked, 0 problem(s)`.

Then run `npm run dev` and open two or three of the new lessons: the sidebar shows chapters 1–6 with numbers 1–35, and each lesson reads well.

---

### Task 13: SQL lesson content — chapters 7 to 11

**Files:**
- Create: 28 lesson files under `content/sql/lessons/07-set-operators/` … `11-types-constraints/`.

**Interfaces:**
- Consumes: authoring rules from Task 12.
- Produces: lessons 36–63.

- [ ] **Step 1: Chapter "Set Operators" (`lessons/07-set-operators/`)** — all `rows-unordered`

| File | id | title | order | Task must ask for | Solution |
|---|---|---|---|---|---|
| `01-union.md` | `union` | Combining Results with UNION | 1 | every country found in `users` or `suppliers`, once each | `SELECT country FROM users UNION SELECT country FROM suppliers;` |
| `02-union-all.md` | `union-all` | Keeping Duplicates with UNION ALL | 2 | the same list, keeping duplicates | `SELECT country FROM users UNION ALL SELECT country FROM suppliers;` |
| `03-intersect.md` | `intersect` | Rows in Both with INTERSECT | 3 | countries that have both users and suppliers | `SELECT country FROM users INTERSECT SELECT country FROM suppliers;` |
| `04-except.md` | `except` | Rows in One but Not the Other with EXCEPT | 4 | countries that have users but no suppliers | `SELECT country FROM users EXCEPT SELECT country FROM suppliers;` |

- [ ] **Step 2: Chapter "Modifying Data" (`lessons/08-modifying/`)** — all `check: state`

Each explanation must mention that **Reset DB** restores the original data.

| File | id | title | order | checkQuery | Task must ask for | Solution |
|---|---|---|---|---|---|---|
| `01-insert-row.md` | `insert-row` | Adding a Row with INSERT | 1 | `SELECT name, description FROM categories ORDER BY id` | add category "Music" with description "Instruments and audio gear" | `INSERT INTO categories (name, description) VALUES ('Music', 'Instruments and audio gear');` |
| `02-insert-many.md` | `insert-many` | Inserting Several Rows at Once | 2 | `SELECT name, country, contact_email FROM suppliers ORDER BY id` | add suppliers "Kiwi Crafts" (New Zealand, hi@kiwi.example) and "Maple Market" (Canada, no email) in one statement | `INSERT INTO suppliers (name, country, contact_email) VALUES ('Kiwi Crafts', 'New Zealand', 'hi@kiwi.example'), ('Maple Market', 'Canada', NULL);` |
| `03-insert-select.md` | `insert-select` | Inserting the Result of a SELECT | 3 | `SELECT product_id, user_id, rating, comment FROM reviews ORDER BY id` | every user from Ireland gives product 6 a 5-star review "Loved it" dated 2024-05-01, with one INSERT … SELECT | `INSERT INTO reviews (product_id, user_id, rating, comment, review_date) SELECT 6, id, 5, 'Loved it', DATE '2024-05-01' FROM users WHERE country = 'Ireland';` |
| `04-update-one.md` | `update-one` | Changing a Value with UPDATE | 4 | `SELECT id, stock FROM products ORDER BY id` | set the stock of product 5 to 100 | `UPDATE products SET stock = 100 WHERE id = 5;` |
| `05-update-columns.md` | `update-columns` | Updating Several Columns | 5 | `SELECT id, price, stock FROM products ORDER BY id` | set "Smart Watch" price to 139.00 and stock to 20 | `UPDATE products SET price = 139.00, stock = 20 WHERE name = 'Smart Watch';` |
| `06-update-expression.md` | `update-expression` | Updating with an Expression | 6 | `SELECT id, price FROM products ORDER BY id` | raise the price of every book (category 2) by 10 %, rounded to 2 decimals | `UPDATE products SET price = ROUND(price * 1.10, 2) WHERE category_id = 2;` |
| `07-delete-where.md` | `delete-where` | Removing Rows with DELETE | 7 | `SELECT id FROM orders ORDER BY id` | delete orders that have no status | `DELETE FROM orders WHERE status IS NULL;` |
| `08-delete-using.md` | `delete-using` | Deleting with a Join (USING) | 8 | `SELECT id FROM reviews ORDER BY id` | delete every review written by a customer from the USA | `DELETE FROM reviews AS r USING users AS u WHERE u.id = r.user_id AND u.country = 'USA';` |

The first lesson must warn that `DELETE`/`UPDATE` without `WHERE` changes every row.

- [ ] **Step 3: Chapter "Common Table Expressions" (`lessons/09-ctes/`)** — all `rows-unordered`

| File | id | title | order | Task must ask for | Solution |
|---|---|---|---|---|---|
| `01-basic-cte.md` | `basic-cte` | Naming a Subquery with WITH | 1 | using a CTE named `big_orders`, the `id`, `user_id`, `quantity` of orders with quantity 2 or more | `WITH big_orders AS (SELECT * FROM orders WHERE quantity >= 2) SELECT id, user_id, quantity FROM big_orders;` |
| `02-multiple-ctes.md` | `multiple-ctes` | Chaining Several CTEs | 2 | revenue (quantity × price) per category: `name`, `revenue`, only categories with orders | `WITH order_totals AS (SELECT o.product_id, o.quantity * p.price AS total FROM orders AS o JOIN products AS p ON p.id = o.product_id), category_totals AS (SELECT p.category_id, SUM(t.total) AS revenue FROM order_totals AS t JOIN products AS p ON p.id = t.product_id GROUP BY p.category_id) SELECT c.name, ct.revenue FROM category_totals AS ct JOIN categories AS c ON c.id = ct.category_id;` |
| `03-cte-filter.md` | `cte-filter` | Filtering on an Aggregate with a CTE | 3 | customers who spent more than 200 in total: `name`, `total` | `WITH spend AS (SELECT o.user_id, SUM(o.quantity * p.price) AS total FROM orders AS o JOIN products AS p ON p.id = o.product_id GROUP BY o.user_id) SELECT u.name, s.total FROM spend AS s JOIN users AS u ON u.id = s.user_id WHERE s.total > 200;` |
| `04-recursive-cte.md` | `recursive-cte` | Walking a Hierarchy with WITH RECURSIVE | 4 | everyone in Kavya Rao's (id 1) reporting chain including her: `name`, `level` (Kavya = 1) | `WITH RECURSIVE team AS (SELECT id, name, 1 AS level FROM employees WHERE id = 1 UNION ALL SELECT e.id, e.name, t.level + 1 FROM employees AS e JOIN team AS t ON e.manager_id = t.id) SELECT name, level FROM team;` |

The recursive lesson must warn that a recursive CTE needs a stopping condition (the lab stops runaway queries after 5 seconds).

- [ ] **Step 4: Chapter "Advanced Queries" (`lessons/10-advanced/`)**

| File | id | title | order | check | Task must ask for | Solution |
|---|---|---|---|---|---|---|
| `01-row-number.md` | `row-number` | Numbering Rows with ROW_NUMBER | 1 | rows-ordered | `name`, `price` and a position `rank` (1 = most expensive), most expensive first | `SELECT name, price, ROW_NUMBER() OVER (ORDER BY price DESC) AS rank FROM products ORDER BY price DESC;` |
| `02-rank-partition.md` | `rank-partition` | Ranking within Groups | 2 | rows-unordered | `name`, `category_id`, `price_rank` = rank by price (highest 1) within each category | `SELECT name, category_id, RANK() OVER (PARTITION BY category_id ORDER BY price DESC) AS price_rank FROM products;` |
| `03-case.md` | `case` | Choosing Values with CASE | 3 | rows-unordered | `name`, `price`, `tier` = 'budget' under 30, 'standard' under 100, else 'premium' | `SELECT name, price, CASE WHEN price < 30 THEN 'budget' WHEN price < 100 THEN 'standard' ELSE 'premium' END AS tier FROM products;` |
| `04-coalesce.md` | `coalesce` | Replacing NULLs with COALESCE | 4 | rows-unordered | user `name` and `phone`, with 'no phone' instead of NULL | `SELECT name, COALESCE(phone, 'no phone') AS phone FROM users;` |
| `05-rollup.md` | `rollup` | Subtotals with GROUP BY ROLLUP | 5 | rows-unordered | product count per category as `category`, `products` (include empty categories) plus a grand-total row | `SELECT c.name AS category, COUNT(p.id) AS products FROM categories AS c LEFT JOIN products AS p ON p.category_id = c.id GROUP BY ROLLUP (c.name);` |
| `06-lag.md` | `lag` | Looking Back with LAG | 6 | rows-ordered | order `id`, `order_date` and the previous order's date as `previous_order`, by date then id | `SELECT id, order_date, LAG(order_date) OVER (ORDER BY order_date, id) AS previous_order FROM orders ORDER BY order_date, id;` |

- [ ] **Step 5: Chapter "Data Types & Constraints" (`lessons/11-types-constraints/`)**

| File | id | title | order | check | checkQuery | Task must ask for | Solution |
|---|---|---|---|---|---|---|---|
| `01-integer-types.md` | `integer-types` | Choosing an Integer Type | 1 | state | `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'counters' ORDER BY ordinal_position` | create table `counters` with `id SMALLINT`, `views INTEGER`, `total_bytes BIGINT` | `CREATE TABLE counters (id SMALLINT, views INTEGER, total_bytes BIGINT);` |
| `02-text-types.md` | `text-types` | VARCHAR or TEXT? | 2 | state | `SELECT column_name, data_type, character_maximum_length, is_nullable FROM information_schema.columns WHERE table_name = 'notes' ORDER BY ordinal_position` | create table `notes` with `title VARCHAR(80) NOT NULL` and `body TEXT` | `CREATE TABLE notes (title VARCHAR(80) NOT NULL, body TEXT);` |
| `03-numeric-precision.md` | `numeric-precision` | Exact Money with NUMERIC | 3 | rows-unordered | — | `float_sum` = 0.1 + 0.2 as float8, `numeric_sum` = the same as numeric | `SELECT 0.1::float8 + 0.2::float8 AS float_sum, 0.1::numeric + 0.2::numeric AS numeric_sum;` |
| `04-date-arithmetic.md` | `date-arithmetic` | Working with Dates | 4 | rows-unordered | — | for orders with id ≤ 3: `id`, `order_date`, and `expected_delivery` 7 days later | `SELECT id, order_date, order_date + 7 AS expected_delivery FROM orders WHERE id <= 3;` |
| `05-primary-key.md` | `primary-key` | PRIMARY KEY and UNIQUE | 5 | state | `SELECT con.contype FROM pg_constraint AS con JOIN pg_class AS c ON c.oid = con.conrelid WHERE c.relname = 'tags' ORDER BY con.contype` | create table `tags` with `id SERIAL PRIMARY KEY` and `name VARCHAR(40)` that is unique and required | `CREATE TABLE tags (id SERIAL PRIMARY KEY, name VARCHAR(40) UNIQUE NOT NULL);` |
| `06-foreign-key.md` | `foreign-key` | Linking Tables with FOREIGN KEY | 6 | state | `SELECT c2.relname AS referenced FROM pg_constraint AS con JOIN pg_class AS c ON c.oid = con.conrelid JOIN pg_class AS c2 ON c2.oid = con.confrelid WHERE c.relname = 'wishlist' AND con.contype = 'f' ORDER BY 1` | create table `wishlist` with `id SERIAL PRIMARY KEY`, `user_id` referencing `users(id)` and `product_id` referencing `products(id)`, both required | `CREATE TABLE wishlist (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), product_id INTEGER NOT NULL REFERENCES products(id));` |

The numeric lesson must explain why `float_sum` shows `0.30000000000000004`. The foreign-key lesson should invite the learner to try inserting a wishlist row with a user id that doesn't exist and read the error.

- [ ] **Step 6: Verify**

Run: `npm run check-content`
Expected: `✓ sql: 63 item(s) checked, 0 problem(s)`.

---

### Task 14: SQL problems

**Files:**
- Create: 10 files under `content/sql/problems/01-basics/` … `04-advanced/`.

**Interfaces:**
- Consumes: authoring rules from Task 12. Problems also need `difficulty` and a `## Example` section.
- Produces: the Problems tab.

**Problem-specific rules:** the explanation is a short scenario (who wants the data and why); `## Example` shows the first rows of the real expected output as a Markdown table — get them by opening the problem in the app, **Solution → Load into editor → Run**, and copying up to 5 rows; hints never give the full solution.

Model file — `content/sql/problems/01-basics/01-out-of-stock.md`:
````markdown
---
id: out-of-stock
title: Out of Stock
chapter: Basics
order: 1
difficulty: Easy
dataset: shop
check: rows-unordered
---

The warehouse team is planning this week's restock and needs to know which products have run
out completely.

## Task
Return the `name` of every product whose `stock` is 0. The order does not matter.

## Example
| name |
|---|
| Smart Watch |
| French Press |

## Hint
- Filter `products` with `WHERE`.

## Solution
```sql
SELECT name FROM products WHERE stock = 0;
```
````

- [ ] **Step 1: Write the ten problems**

| File | id | title | chapter | order | difficulty | check | Task must ask for | Solution |
|---|---|---|---|---|---|---|---|---|
| `01-basics/01-out-of-stock.md` | `out-of-stock` | Out of Stock | Basics | 1 | Easy | rows-unordered | (model above) | `SELECT name FROM products WHERE stock = 0;` |
| `01-basics/02-callable-customers.md` | `callable-customers` | Customers to Call | Basics | 2 | Easy | rows-unordered | `name`, `phone` of users under 30 who have a phone | `SELECT name, phone FROM users WHERE age < 30 AND phone IS NOT NULL;` |
| `01-basics/03-top-three.md` | `top-three-products` | Three Priciest Products | Basics | 3 | Easy | rows-ordered | `name`, `price` of the 3 most expensive products, most expensive first | `SELECT name, price FROM products ORDER BY price DESC LIMIT 3;` |
| `02-joins/01-customers-without-orders.md` | `customers-without-orders` | Customers Who Never Ordered | Joins | 1 | Easy | rows-unordered | `name` of users with no orders | `SELECT u.name FROM users AS u LEFT JOIN orders AS o ON o.user_id = u.id WHERE o.id IS NULL;` |
| `02-joins/02-unsold-products.md` | `unsold-products` | Products Nobody Bought | Joins | 2 | Medium | rows-unordered | `name` of products that appear in no order | `SELECT p.name FROM products AS p WHERE NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.product_id = p.id);` |
| `02-joins/03-department-headcount.md` | `department-headcount` | Department Headcount | Joins | 3 | Medium | rows-unordered | every `department` with its `headcount`, including 0 | `SELECT d.name AS department, COUNT(e.id) AS headcount FROM departments AS d LEFT JOIN employees AS e ON e.department_id = d.id GROUP BY d.id, d.name;` |
| `03-aggregation/01-best-paid-department.md` | `best-paid-department` | Best-Paid Department | Aggregation | 1 | Medium | rows-unordered | the department with the highest average salary: `department`, `avg_salary` rounded to 2 decimals | `SELECT d.name AS department, ROUND(AVG(e.salary), 2) AS avg_salary FROM employees AS e JOIN departments AS d ON d.id = e.department_id GROUP BY d.name ORDER BY avg_salary DESC LIMIT 1;` |
| `03-aggregation/02-monthly-revenue.md` | `monthly-revenue` | Monthly Revenue | Aggregation | 2 | Medium | rows-ordered | `month` as YYYY-MM and `revenue` (quantity × price), by month | `SELECT TO_CHAR(o.order_date, 'YYYY-MM') AS month, SUM(o.quantity * p.price) AS revenue FROM orders AS o JOIN products AS p ON p.id = o.product_id GROUP BY 1 ORDER BY 1;` |
| `04-advanced/01-top-rated-per-category.md` | `top-rated-per-category` | Top-Rated Product per Category | Advanced | 1 | Hard | rows-unordered | per category, the reviewed product with the highest average rating (ties → name A→Z): `category`, `product`, `avg_rating` rounded to 2 decimals | `WITH r AS (SELECT p.category_id, p.name, AVG(rv.rating) AS avg_rating FROM products AS p JOIN reviews AS rv ON rv.product_id = p.id GROUP BY p.category_id, p.name), ranked AS (SELECT r.*, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY avg_rating DESC, name) AS rn FROM r) SELECT c.name AS category, ranked.name AS product, ROUND(ranked.avg_rating, 2) AS avg_rating FROM ranked JOIN categories AS c ON c.id = ranked.category_id WHERE rn = 1;` |
| `04-advanced/02-running-spend.md` | `running-spend` | Running Spend per Customer | Advanced | 2 | Hard | rows-ordered | for every order: customer `name`, `order_date`, and `running_total` of that customer's spend so far; by name, date, order id | `SELECT u.name, o.order_date, SUM(o.quantity * p.price) OVER (PARTITION BY o.user_id ORDER BY o.order_date, o.id) AS running_total FROM orders AS o JOIN users AS u ON u.id = o.user_id JOIN products AS p ON p.id = o.product_id ORDER BY u.name, o.order_date, o.id;` |

- [ ] **Step 2: Verify**

Run: `npm run check-content`
Expected: `✓ sql: 73 item(s) checked, 0 problem(s)`.

Run `npm run dev`: the header now shows a **Lessons | Problems** switch; Problems shows 4 groups with difficulty badges; each problem shows its Example table.

---

### Task 15: End-to-end tests and README

**Files:**
- Create: `playwright.config.ts`, `e2e/lab.spec.ts`, `README.md`

**Interfaces:**
- Consumes: the running app (Tasks 6–14). Relies on: lesson 1 title "Selecting Every Column", lesson 2 title "Choosing Columns", button names "Run", "Show hint", "Hide hint", "Load into editor", "Show difference", "Reset DB", "Open lesson list", "Switch to dark mode"; region names "Expected result"; `data-testid="query-editor"`; aside label "Lesson list".

- [ ] **Step 1: Install Playwright**

Run: `npm install -D @playwright/test@^1.55 && npx playwright install chromium`
Expected: Chromium downloaded.

- [ ] **Step 2: Config**

`playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 20_000 },
  use: { baseURL: 'http://localhost:5199', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -w @codeadda/web -- --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: Write the e2e tests**

`e2e/lab.spec.ts`:
```ts
import { expect, test, type Page } from '@playwright/test';

async function openFirstLesson(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Selecting Every Column' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeEnabled();
}

async function typeQuery(page: Page, sql: string) {
  await page.getByTestId('query-editor').locator('.monaco-editor').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Delete');
  await page.keyboard.type(sql);
}

test('the solution passes and the lesson is marked complete', async ({ page }) => {
  await openFirstLesson(page);
  await page.getByRole('button', { name: /Solution/ }).click();
  await page.getByRole('button', { name: 'Load into editor' }).click();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByText('Correct!')).toBeVisible();
  await expect(page.getByRole('link', { name: /Selecting Every Column/ }).getByLabel('completed')).toBeVisible();
});

test('a wrong answer explains the difference', async ({ page }) => {
  await openFirstLesson(page);
  await typeQuery(page, 'SELECT 1 AS x;');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByText('Not quite.')).toBeVisible();
  await page.getByRole('button', { name: 'Show difference' }).click();
  await expect(page.getByRole('region', { name: 'Expected result' })).toBeVisible();
});

test('SQL errors are shown', async ({ page }) => {
  await openFirstLesson(page);
  await typeQuery(page, 'SELECT * FORM users;');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('syntax error');
});

test('hints toggle', async ({ page }) => {
  await openFirstLesson(page);
  await page.getByRole('button', { name: 'Show hint' }).click();
  await expect(page.getByRole('button', { name: 'Hide hint' })).toBeVisible();
});

test('Reset DB restores a dropped table', async ({ page }) => {
  await openFirstLesson(page);
  await typeQuery(page, 'DROP TABLE reviews;');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByText(/use Reset DB/)).toBeVisible();
  await page.getByRole('button', { name: 'Reset DB' }).click();
  await expect(page.getByText('Database reset to the lesson data.')).toBeVisible();
  await page.getByRole('tab', { name: 'Schema' }).click();
  await expect(page.getByRole('button', { name: /^reviews/ })).toBeVisible();
});

test('theme toggle switches data-theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await openFirstLesson(page);
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('mobile drawer opens, navigates and closes', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await openFirstLesson(page);
  const sidebar = page.getByRole('complementary', { name: 'Lesson list' });
  await expect(sidebar).not.toBeInViewport();
  await page.getByRole('button', { name: 'Open lesson list' }).click();
  await expect(sidebar).toBeInViewport();
  await sidebar.getByRole('link', { name: /Choosing Columns/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Choosing Columns' })).toBeVisible();
  await expect(sidebar).not.toBeInViewport();
});
```

- [ ] **Step 4: Run the e2e tests**

Run: `npm run e2e`
Expected: 7 passed. (If `typeQuery` leaves stray auto-closed characters, check with `trace` and adjust only the typing helper — for example use `page.keyboard.insertText(sql)` — not the app.)

- [ ] **Step 5: README**

`README.md`:
````markdown
# CodeAdda

Interactive labs for learning databases by writing real queries. Stage 1 ships the **SQL lab**
(63 lessons, 10 problems) running real PostgreSQL in your browser via PGlite.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

## Checks

```bash
npm test             # unit and component tests (Vitest)
npm run typecheck    # TypeScript
npm run check-content  # runs every lesson/problem solution against its dataset
npm run e2e          # browser tests (Playwright; run `npx playwright install chromium` once)
```

## Add your own lesson

1. Create a Markdown file under `content/sql/lessons/<NN-chapter>/<NN-slug>.md`
   (or `content/sql/problems/...` for a problem).
2. Start it with front-matter:

   ```yaml
   ---
   id: my-lesson            # unique, a-z 0-9 -
   title: My Lesson
   chapter: Filtering Data  # must be listed in content/sql/lab.json
   order: 11                # position inside the chapter
   dataset: shop            # file in content/sql/datasets/ (without .sql)
   check: rows-unordered    # rows-unordered | rows-ordered | state | custom
   # checkQuery: SELECT ...   required for state and custom
   # difficulty: Easy         required for problems
   ---
   ```

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
````

- [ ] **Step 6: Final full verification**

Run: `npm run typecheck && npm test && npm run check-content && npm run e2e`
Expected: all green — no type errors, all unit tests pass, `✓ sql: 73 item(s) checked, 0 problem(s)`, 7 e2e tests passed.
