# SQL Lab ChaiCode-match Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make our SQL Lab look and behave like labs.chaicode.com/sql, with a data-driven "Watch it happen" player and content restructured to ChaiCode's chapter and lesson order. All text stays original.

**Architecture:**
- Keep the existing monorepo: `packages/core` holds the types, `packages/content-loader` parses Markdown into a `Lab`, `packages/engine-pglite` holds the PGlite engine and `describe()`, and `apps/web` is the React UI.
- Add a step-script format (the YAML block under `## Watch it happen`), validated in content-loader and drawn by a single `StepPlayer` component.
- Reshape the existing UI components to match the reference screenshots.
- Rewrite and reorder the content under `content/sql`.

**Tech Stack:** React 19, Vite 7, TypeScript 5.9, Tailwind v4 (tokens in `apps/web/src/styles/tokens.css`), react-router, Monaco, PGlite, zod 3, yaml 2, Vitest 3, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-30-sql-lab-chai-match-design.md` (read it before starting any task).

## Global Constraints

- **No git commits.** The user's rule is "no commits, only development". Every task ends with the changes left in the working tree. Never run `git commit`, `git add -A` or `git stash`.
- **Do not copy ChaiCode prose, step text or LeetLab problems.** `D:\Jaydeep\chai\chai_sql_content.md` may be used only for titles, order and structure.
- Keep our branding: "CodeAdda" and "SQL Lab". No "ChaiLabs", "Chai SQLab" or "Do not Click".
- **Never delete content files.** Removed lessons and problems are *moved* to `content/sql/_archive/`, because they are untracked and a deletion would be permanent.
- Lesson titles must be exactly ChaiCode's titles, as listed in Task 8 and Task 9.
- Every new UI element must work in both `data-theme="light"` and `data-theme="dark"`. Use only token-backed Tailwind colours (`bg-surface`, `text-brand`, `bg-note-bg`, …), never raw hex values in components.
- Commands, all run from `D:\Jaydeep\codeadda`:

  | Purpose | Command |
  |---|---|
  | Type check | `npm run typecheck` |
  | Unit tests | `npx vitest run <path>` |
  | All unit tests | `npm test` |
  | Content check | `npm run check-content` |
  | End-to-end tests | `npm run e2e` |

## Review Focus

- **NULL cells in step tables** (the IS NULL and IS NOT NULL lessons): should render as a muted italic `NULL`, never as an empty cell or the string "null". Pinned in Task 3.
- **Keyboard shortcuts leaking into the editor:** ←, → and Space must only act when focus is inside the player. Typing in Monaco or anywhere else must never move a step. Pinned in Task 3.
- **Switching lesson while autoplay runs:** unmounting the player must clear its timer, with no state update after unmount and no jump on the next lesson. Pinned in Task 3.
- **Archived content leaking back in:** files under `content/sql/_archive/` must never appear in the lab or in `check-content`. Pinned in Task 2.
- **Narrow screens:** a wide step table must scroll inside the player stage, and the page must not scroll horizontally at 600px. Pinned in Task 12 (e2e).

---

### Task 1: Schema descriptions from SQL comments

**Files:**
- Modify: `packages/core/src/types.ts` (`ColumnInfo`, `Relationship`)
- Modify: `packages/engine-pglite/src/describe.ts`
- Create: `packages/engine-pglite/src/describe.test.ts`
- Modify: `content/sql/datasets/shop.sql` (append comments)
- Modify: `apps/web/src/components/SchemaViewer.test.tsx:19` (fixture gets `kind`)

**Interfaces:**
- Produces: `ColumnInfo.description?: string`, `ColumnInfo.displayType?: string`, `Relationship.kind: 'many-to-one' | 'self-reference'`, `Relationship.description?: string`, `displayType(type: string, serial: boolean): string` (exported from `describe.ts`).

- [ ] **Step 1: Extend the types** in `packages/core/src/types.ts`:

```ts
export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimary: boolean;
  isForeign: boolean;
  references?: string;
  /** From COMMENT ON COLUMN. */
  description?: string;
  /** Upper-case display form, e.g. SERIAL, VARCHAR(100), DECIMAL(10,2). */
  displayType?: string;
}

export interface Relationship {
  from: string;
  column: string;
  to: string;
  toColumn: string;
  kind: 'many-to-one' | 'self-reference';
  /** From COMMENT ON CONSTRAINT. */
  description?: string;
}
```

Then add `kind: 'many-to-one'` to the relationship fixture in `apps/web/src/components/SchemaViewer.test.tsx:19`.

- [ ] **Step 2: Write the failing test** `packages/engine-pglite/src/describe.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { describeSchema, displayType } from './describe';

describe('displayType', () => {
  it('maps Postgres types to the display form', () => {
    expect(displayType('integer', true)).toBe('SERIAL');
    expect(displayType('bigint', true)).toBe('BIGSERIAL');
    expect(displayType('integer', false)).toBe('INTEGER');
    expect(displayType('character varying(100)', false)).toBe('VARCHAR(100)');
    expect(displayType('character(2)', false)).toBe('CHAR(2)');
    expect(displayType('numeric(10,2)', false)).toBe('DECIMAL(10,2)');
    expect(displayType('timestamp without time zone', false)).toBe('TIMESTAMP');
    expect(displayType('text', false)).toBe('TEXT');
  });
});

describe('describeSchema', () => {
  const db = new PGlite();
  beforeAll(async () => {
    await db.exec(`
      CREATE TABLE a (id SERIAL PRIMARY KEY, price NUMERIC(10,2), label VARCHAR(20));
      COMMENT ON COLUMN a.price IS 'Price in dollars';
      CREATE TABLE b (
        id SERIAL PRIMARY KEY,
        a_id INTEGER CONSTRAINT b_a_fk REFERENCES a(id),
        parent_id INTEGER REFERENCES b(id)
      );
      COMMENT ON CONSTRAINT b_a_fk ON b IS 'Each b belongs to one a';
    `);
  });
  afterAll(() => db.close());

  it('returns column descriptions and display types', async () => {
    const s = await describeSchema(db);
    const a = s.tables.find((t) => t.name === 'a')!;
    expect(a.columns.map((c) => c.displayType)).toEqual(['SERIAL', 'DECIMAL(10,2)', 'VARCHAR(20)']);
    expect(a.columns[1]!.description).toBe('Price in dollars');
    expect(a.columns[2]!.description).toBeUndefined();
  });

  it('returns relationship kinds and descriptions', async () => {
    const s = await describeSchema(db);
    expect(s.relationships).toEqual(
      expect.arrayContaining([
        { from: 'b', column: 'a_id', to: 'a', toColumn: 'id', kind: 'many-to-one', description: 'Each b belongs to one a' },
        { from: 'b', column: 'parent_id', to: 'b', toColumn: 'id', kind: 'self-reference', description: undefined },
      ]),
    );
  });
});
```

- [ ] **Step 3: Run** `npx vitest run packages/engine-pglite/src/describe.test.ts`. Expected: FAIL (`displayType` is not exported).

- [ ] **Step 4: Implement** in `packages/engine-pglite/src/describe.ts`. Replace `COLUMNS_SQL` and `KEYS_SQL` and update the mapping:

```ts
const COLUMNS_SQL = `
  SELECT c.relname AS table_name, a.attname AS name,
         format_type(a.atttypid, a.atttypmod) AS type, NOT a.attnotnull AS nullable,
         col_description(a.attrelid, a.attnum) AS description,
         COALESCE(pg_get_expr(d.adbin, d.adrelid) LIKE 'nextval(%', false) AS serial
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
  ORDER BY c.relname, a.attnum`;

const KEYS_SQL = `
  SELECT con.contype AS kind, c.relname AS table_name, a.attname AS column_name,
         fc.relname AS ref_table, fa.attname AS ref_column,
         obj_description(con.oid, 'pg_constraint') AS description
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
  JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum
  LEFT JOIN pg_class fc ON fc.oid = con.confrelid
  LEFT JOIN pg_attribute fa ON fa.attrelid = con.confrelid AND fa.attnum = con.confkey[k.ord]
  WHERE n.nspname = 'public' AND con.contype IN ('p', 'f')`;

interface KeyRow { kind: string; table_name: string; column_name: string; ref_table: string | null; ref_column: string | null; description: string | null }
interface ColumnRow { table_name: string; name: string; type: string; nullable: boolean; description: string | null; serial: boolean }

export function displayType(type: string, serial: boolean): string {
  if (serial && type === 'integer') return 'SERIAL';
  if (serial && type === 'bigint') return 'BIGSERIAL';
  return type
    .replace(/^character varying/, 'varchar')
    .replace(/^character\b/, 'char')
    .replace(/^numeric/, 'decimal')
    .replace(/^timestamp with time zone/, 'timestamptz')
    .replace(/^timestamp without time zone/, 'timestamp')
    .toUpperCase();
}
```

In `describeSchema`:
- Type the columns query as `db.query<ColumnRow>(COLUMNS_SQL)`.
- Add `description: c.description ?? undefined, displayType: displayType(c.type, c.serial)` to each column object.
- Change the relationships map to:

```ts
  const relationships: Relationship[] = keys
    .filter((k) => k.kind === 'f')
    .map((k) => ({
      from: k.table_name,
      column: k.column_name,
      to: k.ref_table ?? '',
      toColumn: k.ref_column ?? '',
      kind: k.ref_table === k.table_name ? 'self-reference' : 'many-to-one',
      description: k.description ?? undefined,
    }));
```

- [ ] **Step 5: Run** `npx vitest run packages/engine-pglite` and `npm run typecheck`. Expected: PASS. If typecheck flags any other `Relationship` literal, add `kind: 'many-to-one'` to it.

- [ ] **Step 6: Add comments to `content/sql/datasets/shop.sql`.** Append this block at the end of the file; it uses the default FK constraint names:

```sql
-- Column and relationship descriptions shown in the schema viewer.
COMMENT ON COLUMN users.id IS 'Unique customer id (primary key)';
COMMENT ON COLUMN users.name IS 'Full name';
COMMENT ON COLUMN users.email IS 'Email address, unique per customer';
COMMENT ON COLUMN users.phone IS 'Phone number, NULL when not given';
COMMENT ON COLUMN users.age IS 'Age in years, NULL when not given';
COMMENT ON COLUMN users.country IS 'Country the customer lives in';
COMMENT ON COLUMN users.city IS 'City the customer lives in';
COMMENT ON COLUMN users.signup_date IS 'Day the account was created';
COMMENT ON COLUMN departments.id IS 'Unique department id (primary key)';
COMMENT ON COLUMN departments.name IS 'Department name';
COMMENT ON COLUMN departments.location IS 'Office the department works from';
COMMENT ON COLUMN employees.id IS 'Unique employee id (primary key)';
COMMENT ON COLUMN employees.name IS 'Full name';
COMMENT ON COLUMN employees.email IS 'Work email, unique per employee';
COMMENT ON COLUMN employees.department_id IS 'Department the employee belongs to';
COMMENT ON COLUMN employees.manager_id IS 'Employee this person reports to, NULL for top managers';
COMMENT ON COLUMN employees.salary IS 'Yearly salary';
COMMENT ON COLUMN employees.hire_date IS 'First day at the company';
COMMENT ON COLUMN categories.id IS 'Unique category id (primary key)';
COMMENT ON COLUMN categories.name IS 'Category name, unique';
COMMENT ON COLUMN categories.description IS 'What the category contains';
COMMENT ON COLUMN suppliers.id IS 'Unique supplier id (primary key)';
COMMENT ON COLUMN suppliers.name IS 'Company name';
COMMENT ON COLUMN suppliers.country IS 'Country the supplier is based in';
COMMENT ON COLUMN suppliers.contact_email IS 'Email for orders and questions';
COMMENT ON COLUMN products.id IS 'Unique product id (primary key)';
COMMENT ON COLUMN products.name IS 'Product name';
COMMENT ON COLUMN products.description IS 'Short product description';
COMMENT ON COLUMN products.category_id IS 'Category the product is listed in';
COMMENT ON COLUMN products.supplier_id IS 'Supplier the product comes from';
COMMENT ON COLUMN products.price IS 'Price per unit, never negative';
COMMENT ON COLUMN products.stock IS 'Units in the warehouse';
COMMENT ON COLUMN orders.id IS 'Unique order id (primary key)';
COMMENT ON COLUMN orders.user_id IS 'Customer who placed the order';
COMMENT ON COLUMN orders.product_id IS 'Product that was ordered';
COMMENT ON COLUMN orders.quantity IS 'Units ordered, at least 1';
COMMENT ON COLUMN orders.order_date IS 'Day the order was placed';
COMMENT ON COLUMN orders.status IS 'Order status, NULL when unknown';
COMMENT ON COLUMN reviews.id IS 'Unique review id (primary key)';
COMMENT ON COLUMN reviews.product_id IS 'Product being reviewed';
COMMENT ON COLUMN reviews.user_id IS 'Customer who wrote the review';
COMMENT ON COLUMN reviews.rating IS 'Stars, from 1 to 5';
COMMENT ON COLUMN reviews.comment IS 'Review text, may be NULL';
COMMENT ON COLUMN reviews.review_date IS 'Day the review was written';

COMMENT ON CONSTRAINT employees_department_id_fkey ON employees IS 'Each employee works in one department';
COMMENT ON CONSTRAINT employees_manager_id_fkey ON employees IS 'Each employee may report to a manager, who is also an employee';
COMMENT ON CONSTRAINT products_category_id_fkey ON products IS 'Each product belongs to one category';
COMMENT ON CONSTRAINT products_supplier_id_fkey ON products IS 'Each product comes from one supplier';
COMMENT ON CONSTRAINT orders_user_id_fkey ON orders IS 'Each order is placed by one customer';
COMMENT ON CONSTRAINT orders_product_id_fkey ON orders IS 'Each order is for one product';
COMMENT ON CONSTRAINT reviews_product_id_fkey ON reviews IS 'Each review is about one product';
COMMENT ON CONSTRAINT reviews_user_id_fkey ON reviews IS 'Each review is written by one customer';
```

If the dataset has columns this list misses (compare with the `CREATE TABLE` statements), add a comment for each of them.

- [ ] **Step 7: Run** `npm run check-content`. Expected: `✓ sql: … 0 problem(s)`. A wrong constraint name fails here with `constraint … does not exist`.

- [ ] **Step 8: No commit** (user rule). Leave the changes in the working tree.

---

### Task 2: Lesson format: `## Context`, `## Watch it happen`, sidebar titles

**Files:**
- Modify: `packages/core/src/types.ts` (step types, `LessonItem`, `Lab`)
- Create: `packages/content-loader/src/steps.ts`
- Create: `packages/content-loader/src/steps.test.ts`
- Modify: `packages/content-loader/src/parseItem.ts`, `parseItem.test.ts`
- Modify: `packages/content-loader/src/schema.ts` (`labJson`)
- Modify: `packages/content-loader/src/buildLab.ts`, `buildLab.test.ts`
- Modify: `packages/content-loader/src/index.ts` (export `parseSteps`)

**Interfaces:**
- Produces (in `@codeadda/core`):

```ts
export type StepTone = 'focus' | 'kept' | 'removed';
export type StepCell = string | number | boolean | null;
export interface StepTable { label?: string; columns: string[]; rows: StepCell[][] }
export type StepHighlight =
  | { table: string; tone: StepTone; row: number }
  | { table: string; tone: StepTone; column: string }
  | { table: string; tone: StepTone; cell: [number, string] };
export interface StepNote { title: string; text?: string; tone: StepTone | 'info' }
export interface Step {
  label: string;
  caption: string;
  show?: string[];
  highlight: StepHighlight[];
  dim: { table: string; rows: number[] }[];
  labels: Record<string, string>;
  notes: StepNote[];
}
export interface StepScript { tables: Record<string, StepTable>; steps: Step[] }
```

- `LessonItem` gains `context?: string; steps?: StepScript; stepsError?: string`.
- `Lab` gains `sidebarTitle?: string; sidebarSubtitle?: string`.
- `parseSteps(yamlText: string): StepScript | string`. A returned string is the error message.

- [ ] **Step 1: Add the types** above to `packages/core/src/types.ts`. Put them before `LessonItem`, then add the new optional fields to `LessonItem` and `Lab`.

- [ ] **Step 2: Write the failing test** `packages/content-loader/src/steps.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseSteps } from './steps';

const good = `
tables:
  users:
    columns: [id, name, age]
    rows:
      - [1, Ana, 28]
      - [2, Ben, null]
steps:
  - label: A table
    caption: This is \`users\`.
  - label: A row
    caption: One row.
    highlight:
      - { table: users, row: 1, tone: focus }
      - { table: users, column: age, tone: kept }
      - { table: users, cell: [2, name], tone: removed }
    dim: [{ table: users, rows: [2] }]
    labels: { users: "users -- after" }
    notes:
      - { title: "2 rows", text: "Small table." }
`;

describe('parseSteps', () => {
  it('parses a valid script and fills defaults', () => {
    const s = parseSteps(good);
    if (typeof s === 'string') throw new Error(s);
    expect(s.tables.users!.rows[1]).toEqual([2, 'Ben', null]);
    expect(s.steps[0]!.highlight).toEqual([]);
    expect(s.steps[0]!.notes).toEqual([]);
    expect(s.steps[1]!.notes[0]!.tone).toBe('info');
    expect(s.steps[1]!.highlight).toHaveLength(3);
  });

  it.each([
    ['bad yaml', 'tables: [', /invalid YAML/],
    ['one step', good.replace(/  - label: A row[\s\S]*$/, ''), /at least 2 steps/],
    ['unknown table', good.replace('{ table: users, row: 1', '{ table: orders, row: 1'), /step 2: unknown table "orders"/],
    ['unknown column', good.replace('column: age', 'column: email'), /step 2: table "users" has no column "email"/],
    ['row out of range', good.replace('row: 1,', 'row: 9,'), /step 2: table "users" has no row 9/],
    ['cell row out of range', good.replace('cell: [2, name]', 'cell: [3, name]'), /has no row 3/],
    ['dim row out of range', good.replace('rows: [2] }', 'rows: [5] }'), /has no row 5/],
    ['ragged row', good.replace('[2, Ben, null]', '[2, Ben]'), /table "users" row 2 has 2 values but 3 columns/],
    ['unknown label table', good.replace('labels: { users:', 'labels: { orders:'), /unknown table "orders"/],
    ['bad tone', good.replace('tone: focus', 'tone: loud'), /tone/],
    ['unknown key', good.replace('label: A table', 'label: A table\n    colour: red'), /colour|Unrecognized/],
  ])('rejects %s', (_name, text, message) => {
    const r = parseSteps(text);
    expect(typeof r).toBe('string');
    expect(r as string).toMatch(message);
  });
});
```

- [ ] **Step 3: Run** `npx vitest run packages/content-loader/src/steps.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 4: Implement** `packages/content-loader/src/steps.ts`:

```ts
import { parse } from 'yaml';
import { z } from 'zod';
import type { StepScript, StepTable } from '@codeadda/core';
import { formatZodError } from './schema';

const tone = z.enum(['focus', 'kept', 'removed']);
const cell = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const table = z
  .object({ label: z.string().optional(), columns: z.array(z.string().min(1)).min(1), rows: z.array(z.array(cell)) })
  .strict();
const highlight = z.union([
  z.object({ table: z.string(), tone, row: z.number().int().min(1) }).strict(),
  z.object({ table: z.string(), tone, column: z.string() }).strict(),
  z.object({ table: z.string(), tone, cell: z.tuple([z.number().int().min(1), z.string()]) }).strict(),
]);
const step = z
  .object({
    label: z.string().min(1),
    caption: z.string().min(1),
    show: z.array(z.string()).optional(),
    highlight: z.array(highlight).default([]),
    dim: z.array(z.object({ table: z.string(), rows: z.array(z.number().int().min(1)) }).strict()).default([]),
    labels: z.record(z.string()).default({}),
    notes: z
      .array(
        z
          .object({ title: z.string().min(1), text: z.string().optional(), tone: z.enum(['info', 'focus', 'kept', 'removed']).default('info') })
          .strict(),
      )
      .default([]),
  })
  .strict();
const script = z
  .object({
    tables: z.record(table).refine((t) => Object.keys(t).length > 0, 'needs at least one table'),
    steps: z.array(step).min(2, 'needs at least 2 steps').max(8, 'allows at most 8 steps'),
  })
  .strict();

/** Parse and validate a "Watch it happen" YAML block. Returns the script, or an error message. */
export function parseSteps(yamlText: string): StepScript | string {
  let data: unknown;
  try {
    data = parse(yamlText);
  } catch (e) {
    return `invalid YAML: ${e instanceof Error ? e.message : String(e)}`;
  }
  const r = script.safeParse(data);
  if (!r.success) return formatZodError(r.error);
  const s = r.data;

  for (const [name, t] of Object.entries(s.tables)) {
    const bad = t.rows.findIndex((row) => row.length !== t.columns.length);
    if (bad >= 0) return `table "${name}" row ${bad + 1} has ${t.rows[bad]!.length} values but ${t.columns.length} columns`;
  }

  for (const [i, st] of s.steps.entries()) {
    const where = `step ${i + 1}`;
    const problems: string[] = [];
    const tableRef = (name: string): StepTable | undefined => {
      const t = s.tables[name];
      if (!t) problems.push(`${where}: unknown table "${name}"`);
      return t;
    };
    const rowRef = (name: string, t: StepTable, n: number) => {
      if (n > t.rows.length) problems.push(`${where}: table "${name}" has no row ${n}`);
    };
    const colRef = (name: string, t: StepTable, c: string) => {
      if (!t.columns.includes(c)) problems.push(`${where}: table "${name}" has no column "${c}"`);
    };
    st.show?.forEach(tableRef);
    Object.keys(st.labels).forEach(tableRef);
    for (const h of st.highlight) {
      const t = tableRef(h.table);
      if (!t) continue;
      if ('row' in h) rowRef(h.table, t, h.row);
      else if ('column' in h) colRef(h.table, t, h.column);
      else {
        rowRef(h.table, t, h.cell[0]);
        colRef(h.table, t, h.cell[1]);
      }
    }
    for (const d of st.dim) {
      const t = tableRef(d.table);
      if (t) d.rows.forEach((n) => rowRef(d.table, t, n));
    }
    if (problems.length) return problems[0]!;
  }
  return s as StepScript;
}
```

Export it from `packages/content-loader/src/index.ts` by adding `export { parseSteps } from './steps';`.

- [ ] **Step 5: Run** `npx vitest run packages/content-loader/src/steps.test.ts`. Expected: PASS. If the "unknown key" case message differs, loosen that regex to whatever zod reports for `.strict()` (`Unrecognized key(s)`).

- [ ] **Step 6: Write failing parseItem and buildLab tests.** Append to `parseItem.test.ts`:

```ts
describe('parseItem: context and watch it happen', () => {
  const base = (extra: string) => `---
id: x
title: X
chapter: A
order: 1
dataset: shop
---

Intro.

${extra}
## Context
Some context.

## Task
Do it.

## Solution
\`\`\`sql
SELECT 1;
\`\`\`
`;
  const yaml = '```yaml\ntables:\n  t:\n    columns: [a]\n    rows: [[1]]\nsteps:\n  - { label: One, caption: First }\n  - { label: Two, caption: Second }\n```\n';

  it('reads Context and the step script', () => {
    const r = parseItem('lessons/x.md', base(`## Watch it happen\n${yaml}`), 'lesson');
    if (isContentError(r)) throw new Error(r.message);
    expect(r.context).toBe('Some context.');
    expect(r.steps?.steps.map((s) => s.label)).toEqual(['One', 'Two']);
    expect(r.stepsError).toBeUndefined();
  });

  it('keeps the lesson but records a broken script', () => {
    const r = parseItem('lessons/x.md', base('## Watch it happen\n```yaml\ntables: {}\nsteps: []\n```\n'), 'lesson');
    if (isContentError(r)) throw new Error(r.message);
    expect(r.steps).toBeUndefined();
    expect(r.stepsError).toMatch(/table|steps/);
  });

  it('records a missing yaml block', () => {
    const r = parseItem('lessons/x.md', base('## Watch it happen\nno code here\n'), 'lesson');
    if (isContentError(r)) throw new Error(r.message);
    expect(r.stepsError).toMatch(/yaml code block/);
  });

  it('leaves context and steps undefined when absent', () => {
    const r = parseItem('lessons/x.md', base('').replace('## Context\nSome context.\n', ''), 'lesson');
    if (isContentError(r)) throw new Error(r.message);
    expect(r.context).toBeUndefined();
    expect(r.steps).toBeUndefined();
  });
});
```

Append to `buildLab.test.ts`, reusing whatever lesson helper and `labJson` the file already defines (read it first). The test must assert:
- A file at `_archive/lessons/old.md`, and one at `_archive/problems/old.md`, both valid lessons, are **not** in `lab.lessons` or `lab.problems`, and produce no error.
- A lesson with a broken `## Watch it happen` block stays in `lab.lessons`, and `lab.errors` contains `{ path, message: expect.stringMatching(/^Watch it happen: /) }`.
- A `labJson` with `"sidebarTitle": "The SQL Codex", "sidebarSubtitle": "Begin"` produces `lab.sidebarTitle === 'The SQL Codex'` and `lab.sidebarSubtitle === 'Begin'`.

- [ ] **Step 7: Run** `npx vitest run packages/content-loader`. Expected: the new tests FAIL. The `_archive` test may already pass, because `buildLab` only reads `lessons/` and `problems/` paths; keep it anyway as a regression test.

- [ ] **Step 8: Implement.** In `parseItem.ts`, after the solution and setup checks:

```ts
    let steps: StepScript | undefined;
    let stepsError: string | undefined;
    const watch = sections['watch it happen'];
    if (watch !== undefined) {
      const yamlText = firstCodeBlock(watch);
      const parsed = yamlText ? parseSteps(yamlText) : '"## Watch it happen" needs a ```yaml code block';
      if (typeof parsed === 'string') stepsError = parsed;
      else steps = parsed;
    }
```

Import `parseSteps` from `./steps` and `StepScript` from `@codeadda/core`. Add `context: sections['context'] || undefined, steps, stepsError,` to the returned object.

In `schema.ts`, add `sidebarTitle: z.string().optional(), sidebarSubtitle: z.string().optional(),` to `labJson`.

In `buildLab.ts`:
- After `seen.set(r.id, path);`, add `if (r.stepsError) errors.push({ path, message: \`Watch it happen: ${r.stepsError}\` });`.
- Add `sidebarTitle: meta.sidebarTitle, sidebarSubtitle: meta.sidebarSubtitle,` to the returned lab.

- [ ] **Step 9: Run** `npx vitest run packages/content-loader`, `npm run typecheck` and `npm run check-content`. Expected: all PASS.

- [ ] **Step 10: No commit** (user rule).

---

### Task 3: `StepPlayer` component

**Files:**
- Create: `apps/web/src/components/StepPlayer.tsx`
- Create: `apps/web/src/components/StepPlayer.test.tsx`
- Modify: `apps/web/src/styles/tokens.css` (`--color-grid-line` in the light and dark blocks)
- Modify: `apps/web/src/styles/app.css` (`.graph-paper`, `.step-fill`)

**Interfaces:**
- Consumes: `StepScript`, `Step`, `StepTable`, `StepCell` and `StepTone` from `@codeadda/core` (Task 2).
- Produces: `export function StepPlayer({ script }: { script: StepScript }): JSX.Element` and `export const STEP_MS = 4500`.
- Accessible names: the play button is `Play`, `Pause` or `Replay`; the arrow buttons are `Previous step` and `Next step`; each step label is a button with `aria-current="step"` on the current one; the caption region has `aria-live="polite"`; each table is a `<figure data-table={name}>` and each cell `<td data-tone={tone}>`.

- [ ] **Step 1: Write the failing test** `apps/web/src/components/StepPlayer.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { StepScript } from '@codeadda/core';
import { STEP_MS, StepPlayer } from './StepPlayer';

const script: StepScript = {
  tables: {
    users: { columns: ['id', 'name', 'phone'], rows: [[1, 'Ana', '555-0101'], [2, 'Ben', null]] },
    result: { label: 'result', columns: ['name'], rows: [['Ana']] },
  },
  steps: [
    { label: 'A table', caption: 'This is `users`.', show: ['users'], highlight: [], dim: [], labels: {}, notes: [] },
    {
      label: 'Filter', caption: 'Keep one row.', show: ['users'],
      highlight: [{ table: 'users', row: 1, tone: 'kept' }, { table: 'users', cell: [1, 'name'], tone: 'focus' }],
      dim: [{ table: 'users', rows: [2] }], labels: { users: 'users -- filtered' },
      notes: [{ title: '1 row kept', text: 'Ben is dropped.', tone: 'info' }],
    },
    { label: 'Result', caption: 'The result.', highlight: [], dim: [], labels: {}, notes: [] },
  ],
};

const caption = () => screen.getByTestId('step-caption');
const cellsOf = (table: string) => within(document.querySelector(`[data-table="${table}"]`) as HTMLElement).getAllByRole('cell');

describe('StepPlayer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the first step and only the tables it lists', () => {
    render(<StepPlayer script={script} />);
    expect(caption()).toHaveTextContent('This is users.');
    expect(document.querySelector('[data-table="users"]')).toBeInTheDocument();
    expect(document.querySelector('[data-table="result"]')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous step' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'A table' })).toHaveAttribute('aria-current', 'step');
  });

  it('renders NULL cells as a muted NULL', () => {
    render(<StepPlayer script={script} />);
    const nullCell = cellsOf('users')[5]!;
    expect(nullCell).toHaveTextContent('NULL');
    expect(nullCell.className).toMatch(/italic/);
  });

  it('applies highlights with cell > row precedence, dims rows, overrides labels and shows notes', () => {
    render(<StepPlayer script={script} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    const cells = cellsOf('users');
    expect(cells[0]).toHaveAttribute('data-tone', 'kept');
    expect(cells[1]).toHaveAttribute('data-tone', 'focus');
    expect(cells[3]).not.toHaveAttribute('data-tone');
    expect(cells[3]!.closest('tr')!.className).toMatch(/opacity/);
    expect(screen.getByText('users -- filtered')).toBeInTheDocument();
    expect(screen.getByText('1 row kept')).toBeInTheDocument();
  });

  it('jumps to a step from its label, and disables Next at the end', () => {
    render(<StepPlayer script={script} />);
    fireEvent.click(screen.getByRole('button', { name: 'Result' }));
    expect(caption()).toHaveTextContent('The result.');
    expect(document.querySelector('[data-table="result"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
  });

  it('autoplays through the steps, stops at the end and can replay', () => {
    render(<StepPlayer script={script} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(STEP_MS));
    expect(caption()).toHaveTextContent('Keep one row.');
    act(() => vi.advanceTimersByTime(STEP_MS));
    expect(caption()).toHaveTextContent('The result.');
    act(() => vi.advanceTimersByTime(STEP_MS));
    expect(screen.getByRole('button', { name: 'Replay' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Replay' }));
    expect(caption()).toHaveTextContent('This is users.');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('pauses when the user steps manually', () => {
    render(<StepPlayer script={script} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(STEP_MS * 2));
    expect(caption()).toHaveTextContent('Keep one row.');
  });

  it('handles arrow keys and Space only inside the player', () => {
    render(
      <>
        <input aria-label="elsewhere" />
        <StepPlayer script={script} />
      </>,
    );
    fireEvent.keyDown(screen.getByLabelText('elsewhere'), { key: 'ArrowRight' });
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(caption()).toHaveTextContent('This is users.');
    const player = screen.getByRole('group', { name: 'Watch it happen' });
    fireEvent.keyDown(player, { key: 'ArrowRight' });
    expect(caption()).toHaveTextContent('Keep one row.');
    fireEvent.keyDown(player, { key: 'ArrowLeft' });
    expect(caption()).toHaveTextContent('This is users.');
    fireEvent.keyDown(player, { key: ' ' });
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('clears its timer on unmount', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(<StepPlayer script={script} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.runAllTimers());
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});
```

- [ ] **Step 2: Run** `npx vitest run apps/web/src/components/StepPlayer.test.tsx`. Expected: FAIL (module not found).

- [ ] **Step 3: Add styles.**

In `tokens.css`, add `--color-grid-line: rgba(28, 25, 23, 0.05);` to the light block and `--color-grid-line: rgba(255, 255, 255, 0.05);` to the dark block.

In `app.css`, inside `@layer components`, add:

```css
  .graph-paper {
    background-color: var(--color-bg-secondary);
    background-image:
      linear-gradient(var(--color-grid-line) 1px, transparent 1px),
      linear-gradient(90deg, var(--color-grid-line) 1px, transparent 1px);
    background-size: 20px 20px;
  }
  @keyframes step-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  .step-fill { transform-origin: left; animation: step-fill var(--step-ms, 4500ms) linear forwards; }
  @media (prefers-reduced-motion: reduce) {
    .step-fill { animation: none; }
  }
```

- [ ] **Step 4: Implement** `apps/web/src/components/StepPlayer.tsx`:

```tsx
import { useEffect, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { Step, StepCell, StepScript, StepTable, StepTone } from '@codeadda/core';
import { cx } from '../lib/cx';
import { Markdown } from './Markdown';

export const STEP_MS = 4500;

const CELL_TONE: Record<StepTone, string> = {
  focus: 'bg-brand-muted text-ink',
  kept: 'bg-ok-bg text-ink',
  removed: 'bg-bad-bg text-bad line-through',
};
const NOTE_TONE: Record<StepTone | 'info', string> = {
  info: 'border-note-line bg-note-bg text-note',
  focus: 'border-brand-line bg-brand-muted text-brand',
  kept: 'border-ok-line bg-ok-bg text-ok',
  removed: 'border-bad-line bg-bad-bg text-bad',
};

/** Cell highlight beats row highlight, which beats column highlight. */
function cellTone(step: Step, table: string, row: number, column: string): StepTone | undefined {
  let tone: StepTone | undefined;
  let rank = 0;
  for (const h of step.highlight) {
    if (h.table !== table) continue;
    const r =
      'cell' in h ? (h.cell[0] === row && h.cell[1] === column ? 3 : 0) : 'row' in h ? (h.row === row ? 2 : 0) : h.column === column ? 1 : 0;
    if (r > rank) {
      rank = r;
      tone = h.tone;
    }
  }
  return tone;
}

const formatCell = (v: StepCell) => (v === null ? 'NULL' : String(v));

function StageTable({ name, table, step }: { name: string; table: StepTable; step: Step }) {
  const dimmed = new Set(step.dim.filter((d) => d.table === name).flatMap((d) => d.rows));
  return (
    <figure data-table={name} className="shrink-0">
      <figcaption className="mb-1.5 font-mono text-xs text-brand">{step.labels[name] ?? table.label ?? name}</figcaption>
      <table className="border-separate border-spacing-0 overflow-hidden rounded-md border border-line bg-surface font-mono text-xs">
        <thead>
          <tr className="bg-subtle">
            {table.columns.map((c) => (
              <th key={c} scope="col" className="px-3 py-2 text-left font-semibold tracking-wide text-muted uppercase">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className={cx('transition-opacity duration-200 motion-reduce:transition-none', dimmed.has(ri + 1) && 'opacity-35')}>
              {row.map((v, ci) => {
                const tone = cellTone(step, name, ri + 1, table.columns[ci]!);
                return (
                  <td
                    key={ci}
                    data-tone={tone}
                    className={cx(
                      'border-t border-line px-3 py-2 whitespace-nowrap transition-colors duration-200 motion-reduce:transition-none',
                      typeof v === 'number' && 'text-right',
                      v === null && 'text-faint italic',
                      tone && CELL_TONE[tone],
                    )}
                  >
                    {formatCell(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function PlayIcon({ state }: { state: 'play' | 'pause' | 'replay' }) {
  if (state === 'pause') return <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" rx="1" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" /></svg>;
  if (state === 'replay') return <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M3 8a5 5 0 1 0 1.5-3.5" /><path d="M3 2.5V5h2.5" /></svg>;
  return <svg viewBox="0 0 16 16" className="ml-0.5 size-3.5" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" /></svg>;
}

export function StepPlayer({ script }: { script: StepScript }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = script.steps.length - 1;
  const step = script.steps[index]!;
  const visible = step.show ?? Object.keys(script.tables);
  const state = playing ? 'pause' : index === last ? 'replay' : 'play';

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (index >= last) setPlaying(false);
      else setIndex(index + 1);
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [playing, index, last]);

  const go = (i: number) => {
    setPlaying(false);
    setIndex(Math.max(0, Math.min(last, i)));
  };
  const toggle = () => {
    if (playing) setPlaying(false);
    else {
      if (index === last) setIndex(0);
      setPlaying(true);
    }
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    else if (e.key === ' ' && e.target === e.currentTarget) { e.preventDefault(); toggle(); }
  };

  return (
    <div
      role="group"
      aria-label="Watch it happen"
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="overflow-hidden rounded-xl border border-line bg-surface shadow-soft"
    >
      <div className="graph-paper min-h-[300px] overflow-x-auto p-5">
        <div className="flex items-start gap-6">
          {visible.map((name) => (
            <StageTable key={name} name={name} table={script.tables[name]!} step={step} />
          ))}
          {step.notes.length > 0 && (
            <div className="w-60 shrink-0 space-y-3">
              {step.notes.map((n, i) => (
                <div key={i} className={cx('rounded-lg border px-3.5 py-3 text-xs', NOTE_TONE[n.tone])}>
                  <p className="font-semibold">{n.title}</p>
                  {n.text && <p className="mt-1 leading-relaxed text-muted">{n.text}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div data-testid="step-caption" aria-live="polite" className="border-t border-line px-5 py-4">
        <Markdown>{step.caption}</Markdown>
      </div>
      <div className="flex items-center gap-4 px-5 pt-2 pb-5">
        <button
          type="button"
          onClick={toggle}
          aria-label={state === 'pause' ? 'Pause' : state === 'replay' ? 'Replay' : 'Play'}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-white shadow-glow hover:bg-brand-hover"
        >
          <PlayIcon state={state} />
        </button>
        <ol className="flex min-w-0 flex-1 gap-2">
          {script.steps.map((s, i) => (
            <li key={i} className="min-w-0 flex-1">
              <button type="button" onClick={() => go(i)} aria-current={i === index ? 'step' : undefined} className="block w-full text-left">
                <span className="relative block h-0.5 overflow-hidden rounded bg-line-strong">
                  {i < index && <span className="absolute inset-0 bg-brand" />}
                  {i === index && (
                    <span
                      key={`${index}-${playing}`}
                      className={cx('absolute inset-0 bg-brand', playing && 'step-fill')}
                      style={{ '--step-ms': `${STEP_MS}ms` } as CSSProperties}
                    />
                  )}
                </span>
                <span className={cx('mt-2 block truncate text-xs', i === index ? 'font-medium text-ink' : 'text-faint')}>{s.label}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="flex shrink-0 gap-1.5">
          <button type="button" aria-label="Previous step" disabled={index === 0} onClick={() => go(index - 1)} className="grid size-8 place-items-center rounded-md border border-line text-muted hover:bg-hover disabled:opacity-40">
            ‹
          </button>
          <button type="button" aria-label="Next step" disabled={index === last} onClick={() => go(index + 1)} className="grid size-8 place-items-center rounded-md border border-line text-muted hover:bg-hover disabled:opacity-40">
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run** `npx vitest run apps/web/src/components/StepPlayer.test.tsx` and `npm run typecheck`. Expected: PASS.

- [ ] **Step 6: No commit** (user rule).

---

### Task 4: Top bar and lab header

**Files:**
- Modify: `apps/web/src/components/Navbar.tsx`, `ThemeToggle.tsx`, `LabHeader.tsx`, `ModeTabs.tsx`, `FontSizeSettings.tsx:15-17`
- Create: `apps/web/src/components/LabHeader.test.tsx`
- Modify: `content/sql/lab.json` (subtitle and sidebar fields only, for now)

**Interfaces:**
- Consumes: `Lab` (Task 2 fields).
- Produces the accessible names: tabs `Lessons` and `LeetLab`; buttons `Reset DB` and `Switch to dark mode` / `Switch to light mode`; disabled upcoming-lab items with `aria-disabled="true"`.

- [ ] **Step 1: Write the failing test** `apps/web/src/components/LabHeader.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { Lab, LessonItem } from '@codeadda/core';
import { LabHeader } from './LabHeader';
import { Navbar } from './Navbar';

const item = (id: string, kind: 'lesson' | 'problem'): LessonItem => ({
  kind, id, title: id, chapter: 'A', order: 1, dataset: 'd', check: 'rows-unordered', body: '', task: '', hints: [], solution: '', path: '',
});
const lab: Lab = {
  id: 'sql', title: 'SQL Lab', subtitle: 'Learn SQL, one query at a time', language: 'sql', datasets: {}, errors: [],
  lessons: [{ title: 'A', items: [item('a', 'lesson')] }], problems: [{ title: 'P', items: [item('p', 'problem')] }],
};

describe('LabHeader', () => {
  it('shows the wordmark, subtitle, Lessons/LeetLab tabs and Reset DB', () => {
    render(<MemoryRouter><LabHeader lab={lab} tab="lessons" onOpenDrawer={() => {}} onReset={() => {}} /></MemoryRouter>);
    expect(screen.getByText('SQL')).toHaveClass('text-brand');
    expect(screen.getByText('Learn SQL, one query at a time')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Lessons' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'LeetLab' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('button', { name: 'Reset DB' })).toBeInTheDocument();
  });
});

describe('Navbar', () => {
  it('lists upcoming labs as disabled', () => {
    render(<MemoryRouter><Navbar /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'SQL Lab' })).toBeInTheDocument();
    for (const name of ['PostgreSQL', 'MongoDB', 'Redis']) {
      expect(screen.getByText(name).closest('[aria-disabled]')).toHaveAttribute('aria-disabled', 'true');
    }
  });
});
```

- [ ] **Step 2: Run** `npx vitest run apps/web/src/components/LabHeader.test.tsx`. Expected: FAIL (the tab is still named "Problems", there is no brand span, and there are no upcoming labs).

- [ ] **Step 3: Implement.**

In `ModeTabs.tsx`:
- Change `LABELS` to `{ lessons: 'Lessons', problems: 'LeetLab' }`.
- Change the wrapper class to `flex rounded-lg border border-line bg-subtle p-1 lab:justify-self-center`.
- Change the active tab class to `bg-surface text-ink shadow-soft border border-line` and inactive tabs to `border border-transparent text-muted hover:text-ink`. Tabs are `px-4 py-1`.

`LabHeader.tsx`: replace the returned JSX with:

```tsx
    <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5 lab:grid lab:grid-cols-[1fr_auto_1fr] lab:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onOpenDrawer} aria-label="Open lesson list" className="rounded-md border border-line px-2.5 py-1.5 text-sm text-muted hover:bg-hover lab:hidden">
          ☰
        </button>
        <p className="shrink-0 text-lg font-bold tracking-tight">
          <Wordmark title={lab.title} />
        </p>
        {lab.subtitle && <p className="hidden truncate text-sm text-muted md:block">{lab.subtitle}</p>}
      </div>
      <ModeTabs lab={lab} tab={tab} />
      <div className="ml-auto flex items-center gap-2 lab:justify-self-end">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={resetDisabled}
            title="Reset the practice database"
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-soft hover:bg-hover disabled:opacity-50"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M3 8a5 5 0 1 0 1.5-3.5" />
              <path d="M3 2.5V5h2.5" />
            </svg>
            Reset DB
          </button>
        )}
        <FontSizeSettings />
      </div>
    </div>
```

And add this above the component:

```tsx
/** "SQL Lab" → orange "SQL" + " Lab". */
function Wordmark({ title }: { title: string }) {
  const [head, ...rest] = title.split(' ');
  return (
    <>
      <span className="text-brand">{head}</span>
      {rest.length > 0 && ` ${rest.join(' ')}`}
    </>
  );
}
```

In `FontSizeSettings.tsx:15-17`:
- Change the button class to `grid size-9 place-items-center rounded-md border border-line bg-surface text-sm font-semibold text-ink shadow-soft hover:bg-hover`.
- Change the text `Aa` to `<span aria-hidden="true">A<sup className="text-[0.6em]">A</sup></span>`.
- Keep or add `aria-label="Text size"` on the button, so its name stays stable.

In `ThemeToggle.tsx`:
- Change the class to `grid size-9 place-items-center rounded-md border border-line bg-surface text-muted shadow-soft transition-colors hover:bg-hover hover:text-ink`.
- Replace the ☀/☾ glyphs with inline SVGs (16px, `stroke="currentColor"`): a moon path `M13.5 9.5A5.5 5.5 0 1 1 6.5 2.5a4.5 4.5 0 0 0 7 7z`, and a sun made of `circle cx=8 cy=8 r=3` plus 8 short rays.

`Navbar.tsx`:
- Centre the lab links and add the upcoming ones. Replace the body of `<nav>` with:

```tsx
        <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold text-ink">
          <span className="grid size-7 place-items-center rounded-md bg-brand text-xs font-bold text-white shadow-glow">DB</span>
          <span className="hidden text-brand sm:inline">CodeAdda</span>
        </Link>
        <div className="mx-auto flex min-w-0 items-center gap-1 overflow-x-auto">
          {labs.map((lab) => (
            <NavLink
              key={lab.id}
              to={`/${lab.id}`}
              className={({ isActive }) =>
                cx('whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors', isActive ? 'bg-brand-muted text-brand' : 'text-muted hover:bg-hover hover:text-ink')
              }
            >
              {lab.title}
            </NavLink>
          ))}
          {UPCOMING.filter((u) => !labs.some((l) => l.title.startsWith(u))).map((u) => (
            <span key={u} aria-disabled="true" title="Coming soon" className="cursor-default whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-faint">
              {u}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <span aria-hidden="true" className="size-7 rounded-full bg-[conic-gradient(var(--color-accent),var(--color-info),var(--color-success),var(--color-accent))] opacity-70" />
        </div>
```

Also add `const UPCOMING = ['PostgreSQL', 'MongoDB', 'Redis'];`, set the header background to `bg-surface`, and change the nav max width to `max-w-none px-6`.

In `content/sql/lab.json`, set `"subtitle": "Learn SQL, one query at a time"` and add `"sidebarTitle": "The SQL Codex", "sidebarSubtitle": "Begin your journey as a Data Architect"`.

- [ ] **Step 4: Run** `npx vitest run apps/web/src/components` and `npm run typecheck`. Expected: PASS. Fix any older test that looked up "Problems".

- [ ] **Step 5: No commit** (user rule).

---

### Task 5: Sidebar

**Files:**
- Modify: `apps/web/src/components/Sidebar.tsx`
- Modify: `apps/web/src/components/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `Lab.sidebarTitle` and `sidebarSubtitle`, and `LessonItem.steps` (Task 2).
- Produces:
  - Lesson links contain a number badge `<span data-badge>`, or `✓` with `aria-label="completed"` when done.
  - An animated lesson has a marker with `aria-label="has animation"`.
  - All chapters are expanded by default.

- [ ] **Step 1: Update the tests** in `Sidebar.test.tsx`.
  - Give `item('a', …)` a `steps: { tables: { t: { columns: ['x'], rows: [[1]] } }, steps: [] }` (a cast is fine) so it has the marker.
  - Set `sidebarTitle: 'The SQL Codex', sidebarSubtitle: 'Begin'` on `lab`.
  - Replace the first two `it`s with:

```tsx
  it('expands every chapter and marks the active item', () => {
    renderSidebar('b');
    expect(screen.getByRole('link', { name: /Title b/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /Basics/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Joins/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /Title c/ })).toBeInTheDocument();
  });

  it('numbers lessons across chapters in circle badges, and chapters collapse', async () => {
    renderSidebar('b');
    expect(screen.getByRole('link', { name: /Title c/ }).querySelector('[data-badge]')).toHaveTextContent('3');
    expect(screen.getByRole('link', { name: /Title b/ }).querySelector('[data-badge]')!.className).toMatch(/bg-brand/);
    await userEvent.click(screen.getByRole('button', { name: /Joins/ }));
    expect(screen.queryByRole('link', { name: /Title c/ })).not.toBeInTheDocument();
  });

  it('shows the codex heading and the animation marker', () => {
    renderSidebar('b');
    expect(screen.getByRole('heading', { name: 'The SQL Codex' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Title a/ })).toContainElement(screen.getByLabelText('has animation'));
    expect(screen.getByRole('link', { name: /Title b/ }).querySelector('[aria-label="has animation"]')).toBeNull();
  });
```

The "completion ticks" test changes to: the link for `a` contains `getByLabelText('completed')` and has no `[data-badge]` element.

- [ ] **Step 2: Run** `npx vitest run apps/web/src/components/Sidebar.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement** in `Sidebar.tsx`:
  - Remove the `activeChapter` state logic and its `useEffect`. Use `const [closed, setClosed] = useState<Record<string, boolean>>({});` with `const isOpen = !closed[ch.title];`, and have the toggle call `setClosed((o) => ({ ...o, [ch.title]: isOpen }))`.
  - Heading: `tab === 'lessons' ? { title: lab.sidebarTitle ?? lab.title, subtitle: lab.sidebarSubtitle ?? lab.subtitle } : { title: 'LeetLab', subtitle: 'Original SQL challenges, easy to hard' }`. Render it as `<h2 className="text-base font-semibold">` with the subtitle `text-xs text-muted`.
  - Move the desktop collapse button (`aria-label="Hide lesson list"`) out of the header. Render it as a small tab on the sidebar's right edge: `absolute top-1/2 -right-3 z-10 hidden h-8 w-3 -translate-y-1/2 place-items-center rounded-r-md border border-l-0 border-line bg-surface text-xs text-faint hover:text-ink lab:grid`, with the `aside` given `relative` for `lab:` sizes. Keep its label and handler.
  - Chapter button class: `flex w-full items-center gap-2 px-4 pt-4 pb-1.5 text-left text-[0.6875rem] font-semibold tracking-wider text-faint uppercase hover:text-ink`, with a chevron `⌄` that rotates `-rotate-90` when closed.
  - Lesson link:

```tsx
                            <Link
                              to={itemPath(lab.id, tab, it.id)}
                              onClick={onCloseDrawer}
                              aria-current={active ? 'page' : undefined}
                              className={cx(
                                'mx-2 flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors',
                                active ? 'bg-brand-muted font-medium text-ink' : 'text-ink hover:bg-hover',
                              )}
                            >
                              {isComplete(it.id) ? (
                                <span aria-label="completed" className="grid size-5 shrink-0 place-items-center rounded-full bg-ok-bg text-[0.625rem] font-bold text-ok">✓</span>
                              ) : (
                                <span
                                  data-badge
                                  className={cx(
                                    'grid size-5 shrink-0 place-items-center rounded-full font-mono text-[0.625rem]',
                                    active ? 'bg-brand text-white' : 'bg-subtle text-muted',
                                  )}
                                >
                                  {start + idx + 1}
                                </span>
                              )}
                              <span className="min-w-0 flex-1 truncate">{it.title}</span>
                              {it.difficulty && <DifficultyBadge level={it.difficulty} />}
                              {it.steps && <span aria-label="has animation" className="text-[0.5rem] text-brand">▶</span>}
                            </Link>
```

- [ ] **Step 4: Run** `npx vitest run apps/web/src/components/Sidebar.test.tsx` and `npm run typecheck`. Expected: PASS.

- [ ] **Step 5: No commit** (user rule).

---

### Task 6: Lesson column (Watch it happen, Context, Task, editor, solution, output tabs)

**Files:**
- Modify: `apps/web/src/lab/LessonFlow.tsx`
- Modify: `apps/web/src/components/LessonHeader.tsx`, `HintToggle.tsx`, `QueryEditor.tsx`, `SolutionPanel.tsx`
- Create: `apps/web/src/lab/LessonFlow.test.tsx`
- Modify: `HintToggle.test.tsx` and `SolutionPanel.test.tsx` only if labels break

**Interfaces:**
- Consumes: `StepPlayer` (Task 3); `LessonItem.context`, `steps` and `stepsError` (Task 2).
- Produces the accessible names:
  - The Run button has `aria-label="Run Query"`.
  - The output tabs are `role="tab"`, named `Query Results` and `Database Schema`.
  - The Watch it happen heading has `id="watch-it-happen"`.

- [ ] **Step 1: Write the failing test** `apps/web/src/lab/LessonFlow.test.tsx`. Monaco doesn't render in jsdom, so mock `../components/QueryEditor` to a plain button:

```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Lab, LessonItem } from '@codeadda/core';
import { LessonFlow } from './LessonFlow';
import type { LabEngine } from './useLabEngine';

vi.mock('../components/QueryEditor', () => ({
  QueryEditor: ({ onRun }: { onRun: () => void }) => <button type="button" aria-label="Run Query" onClick={onRun} />,
}));

const base: LessonItem = {
  kind: 'lesson', id: 'x', title: 'SELECT All Columns', chapter: 'Querying Data', order: 1, dataset: 'shop', check: 'rows-unordered',
  body: 'Learn to read a whole table.', task: 'Return every column.', hints: ['Use *'], solution: 'SELECT * FROM users;', path: 'lessons/x.md',
  context: 'The users table has 15 rows.',
};
const lab = { id: 'sql', title: 'SQL Lab', subtitle: '', language: 'sql', lessons: [], problems: [], datasets: {}, errors: [] } as Lab;
const engine = {
  status: 'ready', running: false, runId: 0, run: vi.fn(), sample: vi.fn(), reset: vi.fn(), retry: vi.fn(),
  schema: { tables: [], relationships: [] },
} as unknown as LabEngine;

describe('LessonFlow', () => {
  it('renders the header, context, task and output tabs', () => {
    render(<LessonFlow lab={lab} tab="lessons" item={base} number={1} engine={engine} />);
    expect(screen.getByText('Querying Data · Lesson 1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'SELECT All Columns' })).toBeInTheDocument();
    expect(screen.getByText('The users table has 15 rows.')).toBeInTheDocument();
    expect(screen.getByText('Task:')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Query Results/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Database Schema' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Watch it happen' })).not.toBeInTheDocument();
  });

  it('shows the player when the lesson has steps', () => {
    const steps = {
      tables: { t: { columns: ['a'], rows: [[1]] } },
      steps: [
        { label: 'One', caption: 'First', highlight: [], dim: [], labels: {}, notes: [] },
        { label: 'Two', caption: 'Second', highlight: [], dim: [], labels: {}, notes: [] },
      ],
    };
    render(<LessonFlow lab={lab} tab="lessons" item={{ ...base, steps }} number={1} engine={engine} />);
    expect(screen.getByRole('heading', { name: 'Watch it happen' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Watch it happen' })).toBeInTheDocument();
  });

  it('shows a note instead of the player when the script is broken', () => {
    render(<LessonFlow lab={lab} tab="lessons" item={{ ...base, stepsError: 'step 2: unknown table "x"' }} number={1} engine={engine} />);
    expect(screen.getByText(/animation could not be loaded/)).toBeInTheDocument();
  });
});
```

Read `useLabEngine.ts` for the real `LabEngine` fields, and add any the component reads to the stub.

- [ ] **Step 2: Run** `npx vitest run apps/web/src/lab/LessonFlow.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement.**

`LessonHeader.tsx`:
- Breadcrumb: `<p className="mb-2 font-mono text-xs text-faint">{item.chapter} · {tab === 'lessons' ? 'Lesson' : 'Problem'} {number}</p>`, as one text node so the test string matches. Put `DifficultyBadge` after the `<p>` in a flex row if the item has one.
- Title: `<h1 className="text-[1.875rem] leading-tight font-bold tracking-tight">`.
- Body: `<Markdown className="mt-3 max-w-[760px] text-md">`.
- The Example stays as it is.

`HintToggle.tsx`:
- Button class: `rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-soft hover:bg-hover`.
- Revealed box class: `mt-2 space-y-2 rounded-md border border-line bg-surface px-4 py-3 text-sm`.

`SolutionPanel.tsx`:
- Header button content: a chevron `⌄` (rotate `-rotate-90` when closed), then `<span className="font-medium">Solution</span>`, then `<span className="ml-auto text-xs text-faint">{open ? 'hide' : 'show'}</span>`.
- Code box: `rounded-md border border-line bg-subtle p-3 font-mono text-sm`.
- Load button: `rounded-md border border-brand-line bg-brand-muted px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand-glow`.
- Copy button: `rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-hover`.

`QueryEditor.tsx`:
- Remove the `<kbd>`.
- Run button:

```tsx
        <button
          type="button"
          onClick={onRun}
          disabled={disabled || running}
          aria-label="Run Query"
          className="ml-auto inline-flex items-center gap-2 rounded-md bg-brand px-3.5 py-1.5 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          <svg viewBox="0 0 16 16" className="size-3" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" /></svg>
          {running ? 'Running…' : 'Run Query'}
          <kbd className="hidden rounded bg-white/20 px-1.5 py-0.5 font-mono text-[0.625rem] lab:inline">{MOD}↵</kbd>
        </button>
```

  with `const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl';` at module level.
- In both Monaco themes:
  - Set `rules: [{ token: 'keyword', foreground: 'ea580c', fontStyle: 'bold' }]` (dark: `fb923c`).
  - Set `'editorLineNumber.activeForeground': '#f97316'` (dark: `#fb923c`).
  - Set `'editorLineNumber.foreground'` to `#fdba74` (dark: `#7c2d12`).
- Header label class: `text-xs font-semibold tracking-wider text-faint uppercase`.

`LessonFlow.tsx`: replace the return with:

```tsx
    <div className="space-y-8">
      <LessonHeader tab={tab} item={item} number={number} />

      {item.steps && (
        <section aria-labelledby="watch-it-happen">
          <h2 id="watch-it-happen" className="text-xs font-semibold tracking-wider text-brand uppercase">Watch it happen</h2>
          <p className="mt-1 mb-3 text-sm text-muted">Play it through, or step back and forth yourself.</p>
          <StepPlayer script={item.steps} />
        </section>
      )}
      {item.stepsError && (
        <p role="note" className="rounded-md border border-warn-line bg-warn-bg px-4 py-3 text-sm text-warn">
          This lesson's animation could not be loaded: {item.stepsError}
        </p>
      )}

      <section aria-labelledby="your-turn" className="space-y-3">
        <h2 id="your-turn" className="text-xs font-semibold tracking-wider text-brand uppercase">Your turn</h2>
        {item.context && (
          <div className="rounded-r-lg border-l-[3px] border-brand bg-surface px-5 py-4 shadow-soft">
            <Markdown>{item.context}</Markdown>
          </div>
        )}
        <div className="rounded-r-lg border-l-[3px] border-brand bg-brand-muted px-5 py-4">
          <Markdown className="[&_p]:text-ink [&_p:first-child>strong:first-child]:text-brand">{`**Task:** ${item.task}`}</Markdown>
        </div>
        <HintToggle hints={item.hints} />
      </section>

      {engine.status === 'error' ? (
        <ErrorScreen message={engine.error ?? 'Unknown error'} onRetry={engine.retry} />
      ) : (
        <div className="space-y-4">
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
          <div className="rounded-xl border border-line bg-surface shadow-soft">
            <div role="tablist" aria-label="Output" className="flex gap-4 border-b border-line px-5">
              {(
                [
                  ['results', 'Query Results'],
                  ['schema', 'Database Schema'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={panel === id}
                  onClick={() => setPanel(id)}
                  className={cx(
                    '-mb-px inline-flex items-center gap-1.5 border-b-2 py-3 text-sm font-medium',
                    panel === id ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink',
                  )}
                >
                  {label}
                  {id === 'results' && (
                    <span className="rounded-full bg-subtle px-1.5 font-mono text-[0.625rem] text-muted">
                      {engine.result?.ok ? engine.result.rowCount : 0}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="p-5">
              {panel === 'results' ? (
                <ResultsPanel result={engine.result} running={engine.running} />
              ) : (
                <SchemaViewer schema={engine.schema} disabled={engine.running || engine.status !== 'ready'} onSample={sample} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
```

Add `const sample = (t: TableInfo) => { setPanel('results'); void engine.sample(t); };` and import `StepPlayer` and the `TableInfo` type. The test's `getByText('Task:')` matches the `<strong>` that Markdown renders.

In `ResultsPanel.tsx`, make the empty state `<p className="py-10 text-center text-sm text-faint">Run a query to see results</p>`.

- [ ] **Step 4: Run** `npx vitest run apps/web/src` and `npm run typecheck`. Expected: PASS. Update `HintToggle.test.tsx` and `SolutionPanel.test.tsx` only where a label changed; their behaviour must stay the same.

- [ ] **Step 5: No commit** (user rule).

---

### Task 7: Schema viewer card and bottom "Database schema" section

**Files:**
- Modify: `apps/web/src/components/SchemaViewer.tsx`, `SchemaViewer.test.tsx`
- Create: `apps/web/src/components/SchemaSection.tsx`
- Modify: `apps/web/src/lab/LessonFlow.tsx` (render the section after the output card)

**Interfaces:**
- Consumes: `ColumnInfo.description` and `displayType`; `Relationship.kind` and `description` (Task 1).
- Produces: `SchemaSection({ children }: { children: ReactNode })`, a pill button named `Database schema` with `aria-expanded`, open by default.

- [ ] **Step 1: Update the tests** in `SchemaViewer.test.tsx`.
  - Give the fixture columns `displayType: 'SERIAL'` / `'INTEGER'` and `description: 'Unique user id'` (leave the `user_id` description undefined).
  - Set the relationship to `{ from: 'orders', column: 'user_id', to: 'users', toColumn: 'id', kind: 'many-to-one', description: 'Each order is placed by one user' }`.
  - Assertions:
    - `getByText('SERIAL')` is present.
    - `getByText('Unique user id')` is present.
    - `getByText('(many-to-one)')` and `getByText('Each order is placed by one user')` are present.
    - The heading `Database Schema` is present.
    - The button `View Sample Data` works; it was "View sample data", so update the existing calls.
    - When the `orders` table is expanded, the `user_id` row's description cell is empty, and the row has the `FK` badge.
  - Add a `SchemaSection` test: it starts expanded, clicking `Database schema` hides the children, and clicking again shows them.

- [ ] **Step 2: Run** `npx vitest run apps/web/src/components/SchemaViewer.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement.**

`SchemaViewer.tsx`: keep the props and the loading and empty states, and replace the main markup with:

```tsx
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <h3 className="font-semibold">Database Schema</h3>
        <p className="text-xs text-faint">Explore the tables and their structure</p>
      </div>
      <div className="max-h-[420px] space-y-3 overflow-y-auto bg-page p-4">
        {schema.tables.map((t, idx) => {
          const isOpen = open[t.name] ?? idx === 0;
          return (
            <section key={t.name} className="overflow-hidden rounded-lg border border-line bg-page">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen((o) => ({ ...o, [t.name]: !isOpen }))}
                className={cx('flex w-full items-start gap-3 px-4 py-3 text-left', isOpen && 'bg-subtle')}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm font-semibold">{t.name}</span>
                  {t.description && <span className="block text-xs text-muted">{t.description}</span>}
                  <span className="mt-1.5 block text-[0.6875rem] text-faint">{t.rowCount} rows</span>
                </span>
                <span aria-hidden="true" className="pt-3 text-xs text-faint">{isOpen ? '▴' : '▾'}</span>
              </button>
              {isOpen && (
                <div className="border-t border-line px-4 py-3">
                  <p className="mb-2 text-[0.6875rem] font-semibold tracking-wider text-faint uppercase">Columns</p>
                  <div className="overflow-x-auto rounded-md border border-line">
                    <table className="w-full text-sm">
                      <thead className="bg-subtle">
                        <tr className="text-left text-[0.6875rem] tracking-wider text-muted uppercase">
                          <th className="px-3 py-2 font-semibold">Name</th>
                          <th className="px-3 py-2 font-semibold">Type</th>
                          <th className="px-3 py-2 font-semibold">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.columns.map((c) => (
                          <tr key={c.name} className="border-t border-line">
                            <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">
                              {c.name}
                              {c.isPrimary && <Badge tone="pk">PK</Badge>}
                              {c.isForeign && <Badge tone="fk">FK</Badge>}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs whitespace-nowrap text-muted">{c.displayType ?? c.type.toUpperCase()}</td>
                            <td className="px-3 py-2 text-muted">{c.description ?? ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onSample(t)}
                      disabled={disabled}
                      className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-soft hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      View Sample Data
                    </button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
        {schema.relationships.length > 0 && (
          <div className="rounded-lg border border-line bg-subtle p-4">
            <p className="mb-2 text-[0.6875rem] font-semibold tracking-wider text-faint uppercase">Table relationships</p>
            <ul className="space-y-2">
              {schema.relationships.map((r) => (
                <li key={`${r.from}.${r.column}`} className="rounded-md border-l-[3px] border-brand bg-surface px-3 py-2.5">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <code className="rounded border border-line bg-subtle px-1.5 py-0.5 font-mono text-xs font-semibold">{r.from}</code>
                    <span aria-hidden="true" className="text-brand">→</span>
                    <code className="rounded border border-line bg-subtle px-1.5 py-0.5 font-mono text-xs font-semibold">{r.to}</code>
                    <span className="text-xs text-faint">({r.kind})</span>
                  </p>
                  {r.description && <p className="mt-1.5 text-sm text-muted">{r.description}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
```

Change `Badge` to take `tone: 'pk' | 'fk'`, with classes `ml-1.5 rounded px-1.5 py-0.5 font-sans text-[0.625rem] font-semibold`:
- `pk`: `bg-warn-bg text-warn border border-warn-line`
- `fk`: `bg-note-bg text-note border border-note-line`

`SchemaSection.tsx`:

```tsx
import { useState, type ReactNode } from 'react';
import { cx } from '../lib/cx';

export function SchemaSection({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="space-y-3 pt-6">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink shadow-soft hover:bg-hover"
      >
        <span aria-hidden="true" className={cx('text-xs transition-transform', !open && '-rotate-90')}>⌄</span>
        Database schema
      </button>
      {open && children}
    </section>
  );
}
```

In `LessonFlow.tsx`, directly after the output card (inside the non-error branch), render:

```tsx
          <SchemaSection>
            <SchemaViewer schema={engine.schema} disabled={engine.running || engine.status !== 'ready'} onSample={sample} />
          </SchemaSection>
```

- [ ] **Step 4: Run** `npx vitest run apps/web/src` and `npm run typecheck`. Expected: PASS. If `LessonFlow.test.tsx` now finds two "Database Schema" headings, that's expected; keep its assertions to the tab role.

- [ ] **Step 5: No commit** (user rule).

---

### Task 8: Content: lab.json, archive, and lessons 1–36 (chapters 1–7)

**Files:**
- Modify: `content/sql/lab.json`
- Move: the 3 files listed below into `content/sql/_archive/lessons/`
- Modify: every lesson file in `content/sql/lessons/01-querying` … `07-set-operators`

**Interfaces:**
- Produces: lesson ids that are unchanged except where the table says otherwise. The e2e tests (Task 12) depend on lesson 1 being `select-all`, titled `SELECT All Columns`, and lesson 2 being `select-columns`, titled `SELECT Specific Columns`.

**File shape.** Every lesson is rewritten to this shape, as spec 4.4 says. All text is our own. Never paste ChaiCode sentences.

```markdown
---
id: select-all
title: SELECT All Columns
chapter: Querying Data
order: 1
dataset: shop
check: rows-unordered
---

Read every column and every row of a table with `SELECT *`. The `users` table holds 15 customers, so it makes a good first look.

## Context
`*` is shorthand for "all columns". It's handy while you explore a table you haven't seen before. In real code, name the columns you need instead, so the query keeps working when someone adds a column later.

## Task
Return every column and every row from the `users` table.

## Hint
- The pattern is `SELECT * FROM table_name;`

## Solution
```sql
SELECT * FROM users;
```
```

Rules:
- **Intro:** 1–2 sentences, shown under the title.
- **Context:** 1–3 sentences explaining the idea. The current body text is the source; condense it rather than inventing new material.
- **Task, Hint and Solution:** keep the current ones unless the table below changes them.
- Keep the existing `check` and `checkQuery` values.

- [ ] **Step 1: Update `content/sql/lab.json`** to:

```json
{
  "id": "sql",
  "title": "SQL Lab",
  "subtitle": "Learn SQL, one query at a time",
  "sidebarTitle": "The SQL Codex",
  "sidebarSubtitle": "Begin your journey as a Data Architect",
  "language": "sql",
  "chapters": [
    "Querying Data", "Sorting Data", "Filtering Data", "Joining Tables", "Grouping Data", "Subqueries",
    "Set Operators", "Modifying Data", "Common Table Expressions", "Advanced Topics", "Data Types & Constraints"
  ],
  "problemGroups": ["SELECT", "Basic Joins", "Easy Challenges"]
}
```

Then, in every file under `lessons/10-advanced/`, change `chapter: Advanced Queries` to `chapter: Advanced Topics`, so `check-content` stays green between tasks. Problems temporarily fail their chapter check until Task 11; that is expected.

- [ ] **Step 2: Archive** (a move, never a delete), using PowerShell `Move-Item` or bash `mkdir -p` + `mv`:
  - `content/sql/lessons/02-sorting/04-nulls-last.md` → `content/sql/_archive/lessons/02-sorting/04-nulls-last.md`
  - `content/sql/lessons/07-set-operators/03-intersect.md` → `content/sql/_archive/lessons/07-set-operators/03-intersect.md`
  - `content/sql/lessons/07-set-operators/04-except.md` → `content/sql/_archive/lessons/07-set-operators/04-except.md`

- [ ] **Step 3: Rewrite lessons 1–36.** Set `title` exactly as below, keep `id` and `order`, and reshape the body:

| # | File | id | title |
|---|---|---|---|
| 1 | 01-querying/01-select-all.md | select-all | SELECT All Columns |
| 2 | 01-querying/02-select-columns.md | (keep) | SELECT Specific Columns |
| 3 | 01-querying/03-distinct.md | (keep) | SELECT with DISTINCT |
| 4 | 01-querying/04-limit.md | (keep) | LIMIT Results |
| 5 | 01-querying/05-aliases.md | (keep) | Column Aliases with AS |
| 6 | 02-sorting/01-order-asc.md | (keep) | ORDER BY Ascending |
| 7 | 02-sorting/02-order-desc.md | (keep) | ORDER BY Descending |
| 8 | 02-sorting/03-order-multi.md | (keep) | ORDER BY Multiple Columns |
| 9 | 03-filtering/01-where.md | (keep) | WHERE Clause |
| 10 | 03-filtering/02-comparison.md | (keep) | Comparison Operators |
| 11 | 03-filtering/03-and.md | (keep) | WHERE with AND |
| 12 | 03-filtering/04-or.md | (keep) | WHERE with OR |
| 13 | 03-filtering/05-in.md | (keep) | IN Operator |
| 14 | 03-filtering/06-not-in.md | (keep) | NOT IN Operator |
| 15 | 03-filtering/07-between.md | (keep) | BETWEEN Operator |
| 16 | 03-filtering/08-like.md | (keep) | LIKE Pattern Matching |
| 17 | 03-filtering/09-is-null.md | (keep) | IS NULL |
| 18 | 03-filtering/10-is-not-null.md | (keep) | IS NOT NULL |
| 19 | 04-joins/01-table-aliases.md | (keep) | Table Aliases |
| 20 | 04-joins/02-inner-join.md | (keep) | INNER JOIN Basics |
| 21 | 04-joins/03-left-join.md | (keep) | LEFT JOIN |
| 22 | 04-joins/04-right-join.md | (keep) | RIGHT JOIN |
| 23 | 04-joins/05-self-join.md | (keep) | Self JOIN |
| 24 | 04-joins/06-multi-join.md | (keep) | JOIN Multiple Tables |
| 25 | 04-joins/07-join-where.md | (keep) | JOIN with WHERE |
| 26 | 05-grouping/01-count.md | (keep) | COUNT Function |
| 27 | 05-grouping/02-sum.md | (keep) | SUM Function |
| 28 | 05-grouping/03-avg.md | (keep) | AVG Function |
| 29 | 05-grouping/04-min-max.md | (keep) | MIN and MAX Functions |
| 30 | 05-grouping/05-group-by.md | (keep) | GROUP BY |
| 31 | 05-grouping/06-having.md | (keep) | HAVING Clause |
| 32 | 06-subqueries/01-subquery-where.md | (keep) | Subquery in WHERE |
| 33 | 06-subqueries/02-subquery-from.md | (keep) | Subquery in FROM |
| 34 | 06-subqueries/03-exists.md | (keep) | EXISTS Operator |
| 35 | 07-set-operators/01-union.md | (keep) | UNION |
| 36 | 07-set-operators/02-union-all.md | (keep) | UNION ALL |

- [ ] **Step 4: Run** `npm run check-content`. Expected: no lesson errors. Problem chapter errors are expected until Task 11.

  Also run this, which must print 36:

  ```
  npx tsx -e "import {loadLabFromDir} from '@codeadda/content-loader/node'; const l=loadLabFromDir('content/sql'); console.log(l.lessons.slice(0,7).reduce((n,c)=>n+c.items.length,0))"
  ```

- [ ] **Step 5: No commit** (user rule).

---

### Task 9: Content: lessons 37–62 (chapters 8–11), with 2 new and 2 repurposed

**Files:**
- Modify: every lesson in `content/sql/lessons/08-modifying` … `11-types-constraints`
- Create: `content/sql/lessons/08-modifying/03-insert-columns.md` and `08-modifying/07-update-join.md`
- Rename: the files listed so that the file order follows lesson order

**File moves.** Renames inside `lessons/` are fine: they're moves, not deletes.

| # | New path | From | id | title | order |
|---|---|---|---|---|---|
| 37 | 08-modifying/01-insert-row.md | same | (keep) | INSERT Single Row | 1 |
| 38 | 08-modifying/02-insert-many.md | same | (keep) | INSERT Multiple Rows | 2 |
| 39 | 08-modifying/03-insert-columns.md | **new** | insert-columns | INSERT with Specific Columns | 3 |
| 40 | 08-modifying/04-update-one.md | same | (keep) | UPDATE Single Column | 4 |
| 41 | 08-modifying/05-update-columns.md | same | (keep) | UPDATE Multiple Columns | 5 |
| 42 | 08-modifying/06-update-where.md | 06-update-expression.md | update-where | UPDATE with WHERE Condition | 6 |
| 43 | 08-modifying/07-update-join.md | **new** | update-join | UPDATE with JOIN | 7 |
| 44 | 08-modifying/08-delete-where.md | 07-delete-where.md | (keep) | DELETE with WHERE | 8 |
| 45 | 08-modifying/09-delete-join.md | 08-delete-using.md | (keep) | DELETE with JOIN | 9 |
| 46 | 08-modifying/10-insert-select.md | 03-insert-select.md | (keep) | INSERT INTO SELECT | 10 |
| 47 | 09-ctes/01-basic-cte.md | same | (keep) | Basic CTE with WITH | 1 |
| 48 | 09-ctes/02-multiple-ctes.md | same | (keep) | Multiple CTEs | 2 |
| 49 | 09-ctes/03-cte-aggregation.md | 03-cte-filter.md | cte-aggregation | CTE for Complex Aggregation | 3 |
| 50 | 09-ctes/04-recursive-cte.md | same | (keep) | Recursive CTE | 4 |
| 51 | 10-advanced/01-row-number.md | same | (keep) | ROW_NUMBER Window Function | 1 |
| 52 | 10-advanced/02-rank-partition.md | same | (keep) | RANK Window Function | 2 |
| 53 | 10-advanced/03-case.md | same | (keep) | CASE Expression | 3 |
| 54 | 10-advanced/04-coalesce.md | same | (keep) | COALESCE Function | 4 |
| 55 | 10-advanced/05-rollup.md | same | (keep) | GROUP BY with ROLLUP | 5 |
| 56 | 10-advanced/06-lag.md | same | (keep) | LAG Window Function | 6 |
| 57 | 11-types-constraints/01-integer-types.md | same | (keep) | Understanding INTEGER Types | 1 |
| 58 | 11-types-constraints/02-text-types.md | same | (keep) | Understanding VARCHAR vs TEXT | 2 |
| 59 | 11-types-constraints/03-numeric-precision.md | same | (keep) | Understanding DECIMAL for Money | 3 |
| 60 | 11-types-constraints/04-date-arithmetic.md | same | (keep) | Understanding DATE Types | 4 |
| 61 | 11-types-constraints/05-primary-key.md | same | (keep) | PRIMARY KEY Constraint | 5 |
| 62 | 11-types-constraints/06-foreign-key.md | same | (keep) | FOREIGN KEY Constraint | 6 |

- [ ] **Step 1: Do the renames** listed above. Move `08-delete-using.md` → `09-delete-join.md` and `07-delete-where.md` → `08-delete-where.md` first, then `03-insert-select.md` → `10-insert-select.md`, `06-update-expression.md` → `06-update-where.md`, and `03-cte-filter.md` → `03-cte-aggregation.md`.

- [ ] **Step 2: Repurpose lesson 42** (`update-where`). The lesson is about limiting an UPDATE with WHERE; the old "expression" idea can appear as a secondary line in Context. Its front-matter keeps `check: state`, and the task and solution become:

```markdown
## Task
Sam Lee has moved. Set `city` to `'Toronto'` and `country` to `'Canada'` for the user whose email is `sam@shop.dev`, and change no other row.

## Hint
- Without `WHERE`, `UPDATE` changes every row.
- Match on the unique `email` column.

## Solution
```sql
UPDATE users SET city = 'Toronto', country = 'Canada' WHERE email = 'sam@shop.dev';
```
```

Read `shop.sql` first and use a real user's email and name; `sam@shop.dev` is only an example. Set `checkQuery: SELECT id, name, city, country FROM users ORDER BY id`.

- [ ] **Step 3: Repurpose lesson 49** (`cte-aggregation`). The CTE aggregates first, and the outer query filters the aggregate:

```sql
WITH customer_spend AS (
  SELECT o.user_id, SUM(o.quantity * p.price) AS total_spent
  FROM orders o JOIN products p ON p.id = o.product_id
  GROUP BY o.user_id
)
SELECT u.name, cs.total_spent
FROM customer_spend cs JOIN users u ON u.id = cs.user_id
WHERE cs.total_spent > (SELECT AVG(total_spent) FROM customer_spend)
ORDER BY cs.total_spent DESC;
```

Front-matter: `check: rows-ordered`. Task: "List customers who spent more than the average customer, highest first, with their total."

- [ ] **Step 4: Create lesson 39** `08-modifying/03-insert-columns.md`:

```markdown
---
id: insert-columns
title: INSERT with Specific Columns
chapter: Modifying Data
order: 3
dataset: shop
check: state
checkQuery: SELECT name, email, phone, age, country, city FROM users WHERE email = 'priya@shop.dev'
---

List the columns you are filling, and SQL fills the rest with their defaults or `NULL`.

## Context
Naming the columns makes an `INSERT` independent of the table's column order. Any column you leave out gets its `DEFAULT`, or `NULL` if it has none. `id` is a `SERIAL`, so the database picks it for you.

## Task
Add a customer named `Priya Nair` with email `priya@shop.dev`, country `India` and today's date as `signup_date`. Leave `phone`, `age` and `city` empty.

## Hint
- `INSERT INTO users (name, email, country, signup_date) VALUES (...);`
- `CURRENT_DATE` is today's date.

## Solution
```sql
INSERT INTO users (name, email, country, signup_date) VALUES ('Priya Nair', 'priya@shop.dev', 'India', CURRENT_DATE);
```
```

If `priya@shop.dev` already exists in `shop.sql`, pick another unused name and email, and update the checkQuery to match.

- [ ] **Step 5: Create lesson 43** `08-modifying/07-update-join.md`:

```markdown
---
id: update-join
title: UPDATE with JOIN
chapter: Modifying Data
order: 7
dataset: shop
check: state
checkQuery: SELECT id, price FROM products ORDER BY id
---

Update rows in one table using values that live in another, with `UPDATE … FROM`.

## Context
PostgreSQL joins in an `UPDATE` with a `FROM` clause. The `WHERE` both links the tables and picks the rows to change. Every product row that matches the join gets updated once.

## Task
Every product in the `Electronics` category is going on sale. Lower its `price` by 10%.

## Hint
- `UPDATE products p SET … FROM categories c WHERE …`
- Link `p.category_id = c.id` and filter on `c.name`.

## Solution
```sql
UPDATE products p SET price = ROUND(p.price * 0.9, 2) FROM categories c WHERE p.category_id = c.id AND c.name = 'Electronics';
```
```

Use a category name that exists in `shop.sql`; check the `INSERT INTO categories` rows.

- [ ] **Step 6: Rewrite the remaining files** in the table to the Task 8 shape: set the title and order, add an intro and `## Context`, and keep the task and solution. Change `chapter: Advanced Queries` to `Advanced Topics` if it isn't already done.

- [ ] **Step 7: Run** `npm run check-content`. Expected: all 62 lessons pass (problem chapter errors may remain until Task 11).

  Also run the Task 8 `npx tsx -e` count command, changing `slice(0,7)` to the full `lessons`. Expected: 62.

- [ ] **Step 8: No commit** (user rule).

---

### Task 10: Content: 22 "Watch it happen" scripts

**Files:**
- Modify: the 22 lesson files listed below (add a `## Watch it happen` section between the intro and `## Context`)

**Interfaces:**
- Consumes: the step format from Task 2 (`parseSteps`) and the `StepPlayer` visuals from Task 3.

Rules:
- 3–6 steps each. Labels are 1–3 words.
- Captions are 1–3 sentences of original text. Use `code` for SQL keywords and table names.
- Tables are 3–5 rows sliced from `shop.sql`; use real names and values from the dataset.
- Use `focus` for "look here", `kept` for rows that survive or are added, and `removed` for rows that are filtered out, deleted or rejected.
- Use `dim` for rows that don't take part, and `notes` for one-line takeaways (with a `title` of 2–5 words).
- The final step should show the result table.

- [ ] **Step 1: Lesson 1, `select-all`.** Add this exact block, replacing the values with real `users` rows from `shop.sql`:

````markdown
## Watch it happen
```yaml
tables:
  users:
    columns: [id, name, age, country]
    rows:
      - [1, Aarav Mehta, 28, India]
      - [2, Emma Clarke, 34, UK]
      - [3, Lucas Silva, 41, Brazil]
      - [4, Mia Chen, 25, USA]
steps:
  - label: A table
    caption: This is the `users` table. Data in SQL lives in tables, and every table is a grid.
    notes:
      - { title: "4 rows × 4 columns", text: "Sixteen values, each in exactly one row and one column." }
  - label: A row
    caption: Each **row** is one record. Here, one customer, with everything we know about them on one line.
    highlight: [{ table: users, row: 2, tone: focus }]
    notes:
      - { title: "row = record", text: "Queries add, remove and count rows." }
  - label: A column
    caption: Each **column** is one fact about every row. `age` holds a number for every customer, because a column has one type.
    highlight: [{ table: users, column: age, tone: focus }]
    notes:
      - { title: "column = field", text: "One name, one type, for every row." }
  - label: SELECT *
    caption: "`SELECT * FROM users` asks for every column of every row, so the result is the whole table, unchanged."
    highlight: [{ table: users, row: 1, tone: kept }, { table: users, row: 2, tone: kept }, { table: users, row: 3, tone: kept }, { table: users, row: 4, tone: kept }]
    notes:
      - { title: "all in, all out", text: "No filter and no sorting: 4 rows in, 4 rows out.", tone: kept }
  - label: Use * sparingly
    caption: "`*` is great for exploring, but in real queries name the columns you need, so new columns don't change your results."
    notes:
      - { title: "in real code", text: "List the columns you need.", tone: focus }
```
````

- [ ] **Step 2: Write the other 21 scripts.** Here is what each one must show. Captions and notes are original text:

| # | Lesson | Tables | Steps (label → what's highlighted) |
|---|---|---|---|
| 2 | SELECT Specific Columns | users(id,name,email,age,country), result(name,country) | SELECT * → all · Name the columns → columns name, country `focus`; others dimmed via note · Result → show result · Order is yours → result with columns swapped (second result table `result_swapped`) |
| 6 | ORDER BY Ascending | users(name,age) unsorted, sorted(name,age) | Unsorted → note "no order guaranteed" · Sort key → column age `focus` · Ascending → show sorted, row 1 `kept` · Ties and NULLs → note that NULLs sort last in ASC |
| 9 | WHERE Clause | users(name,country), result | The question → column country `focus` · Test each row → matching rows `kept`, others `removed` · Only matches → show result · WHERE vs SELECT → note: rows vs columns |
| 17 | IS NULL | users(name,phone) with 2 NULL phones | Missing values → NULL cells `focus` · `= NULL` fails → all rows `removed`, note "NULL = NULL is unknown" · IS NULL → NULL rows `kept` · Result |
| 18 | IS NOT NULL | users(name,phone) | Missing values → NULL cells `focus` · IS NOT NULL → non-NULL rows `kept`, NULL rows `removed` · Result · Count check → note on counting |
| 19 | Table Aliases | orders(id,user_id), users(id,name) | Long names → labels `orders o`, `users u` · Qualify columns → cells `o.user_id`/`u.id` `focus` · Alias in SELECT → result |
| 20 | INNER JOIN Basics | orders(id,user_id,product_id), users(id,name), result | Two tables → both shown · Match on key → matching rows `kept` · No match, no row → an orders row whose user doesn't exist (use a made-up slice) `removed` · Result |
| 21 | LEFT JOIN | users(id,name), orders(id,user_id), result with NULL | Keep the left → all users `kept` · Match orders → matched rows `focus` · No match → user with no orders, result cells NULL `focus` · Result |
| 22 | RIGHT JOIN | same shape, mirrored | Keep the right · Match · No match → NULLs on the left · RIGHT = flipped LEFT (note) |
| 26 | COUNT Function | orders(id,status) with a NULL status | Many rows → all · COUNT(*) → all rows `kept`, note "5" · COUNT(status) → NULL row `removed`, note "4" · Result |
| 30 | GROUP BY | products(name,category_id,price), result(category_id,count) | Rows → all · Buckets → same category rows share a tone (`focus` for group 1, `kept` for group 2) · One row per group → result · Aggregate per group → note |
| 31 | HAVING Clause | grouped(category_id,count), result | Groups first → grouped · Filter groups → groups failing `removed` · WHERE vs HAVING → note · Result |
| 32 | Subquery in WHERE | products(name,price), avg(avg_price), result | Inner query first → avg shown, `focus` · Compare each row → rows above avg `kept` · Result |
| 35 | UNION | users(country) slice, suppliers(country) slice, result | Two results → both · Stack → all rows `focus` · Remove duplicates → duplicate rows `removed` · Result |
| 36 | UNION ALL | same slices | Stack · Keep duplicates → duplicates `kept` · Faster → note: no de-duplication pass · Result |
| 37 | INSERT Single Row | users before (3 rows), users after (4 rows, labelled `users -- after insert`) | Before · The new row → new row `kept` · Defaults → id cell `focus`, note "SERIAL fills id" · Verify with SELECT |
| 42 | UPDATE with WHERE Condition | users(id,name,city) before, after | Find the row → target row `focus` · Change it → after table, changed cell `kept` · Without WHERE → every city cell `removed`, note "every row changes" |
| 47 | Basic CTE with WITH | orders slice, spend CTE (user_id,total), result | Name a step → spend shown with label `spend (CTE)` · Use it like a table → spend rows `focus` · Result · Readability → note |
| 51 | ROW_NUMBER Window Function | employees(name,department_id,salary), result with rn | Order in each group → salary `focus` · Number the rows → rn column `kept` · PARTITION BY → rn restarts per department, note · Result |
| 57 | Understanding INTEGER Types | types(type,bytes,max) as a small reference table, orders.quantity sample | Whole numbers → quantity `focus` · Sizes → types rows `focus` one by one · Out of range → a rejected value row `removed`, note on overflow · Pick the smallest safe → note |
| 62 | FOREIGN KEY Constraint | users(id,name), orders(id,user_id,quantity) | Two related tables → both · Insert nonsense → label `orders -- INSERT (103, 9, 1) rejected`, a new orders row with user_id 9 `removed` · The damage → note about orphan rows · Add the constraint → orders.user_id column `focus` · It works both ways → users row 1 `removed` with note about `ON DELETE CASCADE` / `SET NULL` |

For lesson 20, "no match, no row": use slices that don't line up, e.g. an order whose `user_id` isn't in the users slice. The slices are illustrations, not the full dataset, so this is fine. Make the caption say "in this slice".

- [ ] **Step 3: Run** `npm run check-content`. Expected: no `Watch it happen:` errors.

  Also run this, which must print exactly the 22 ids above:

  ```
  npx tsx -e "import {loadLabFromDir} from '@codeadda/content-loader/node'; const l=loadLabFromDir('content/sql'); console.log(l.lessons.flatMap(c=>c.items).filter(i=>i.steps).map(i=>i.id).join(','))"
  ```

- [ ] **Step 4: View three scripts in the app:** lessons 1, 20 and 62. Use `npm run dev` from the repo root. Check that the tables fit, the highlights read clearly, and nothing overflows the stage vertically.

- [ ] **Step 5: No commit** (user rule).

---

### Task 11: Content: LeetLab (8 problems in 3 groups)

**Files:**
- Move: 5 problems to `content/sql/_archive/problems/`
- Modify: the 5 kept problems (their `chapter` and `order`)
- Create: `content/sql/problems/01-select/04-young-customers-abroad.md`, `01-select/05-short-product-names.md`, `03-easy-challenges/01-busy-managers.md`

- [ ] **Step 1: Move the files** (moves only, no deletes):

| From | To |
|---|---|
| problems/01-basics/01-out-of-stock.md | problems/01-select/01-out-of-stock.md (`chapter: SELECT`, `order: 1`) |
| problems/01-basics/02-callable-customers.md | problems/01-select/02-callable-customers.md (`SELECT`, 2) |
| problems/01-basics/03-top-three.md | problems/01-select/03-top-three.md (`SELECT`, 3) |
| problems/02-joins/01-customers-without-orders.md | problems/02-basic-joins/01-customers-without-orders.md (`Basic Joins`, 1) |
| problems/02-joins/02-unsold-products.md | problems/02-basic-joins/02-unsold-products.md (`Basic Joins`, 2) |
| problems/02-joins/03-department-headcount.md | _archive/problems/02-joins/03-department-headcount.md |
| problems/03-aggregation/01-best-paid-department.md | _archive/problems/03-aggregation/01-best-paid-department.md |
| problems/03-aggregation/02-monthly-revenue.md | _archive/problems/03-aggregation/02-monthly-revenue.md |
| problems/04-advanced/01-top-rated-per-category.md | _archive/problems/04-advanced/01-top-rated-per-category.md |
| problems/04-advanced/02-running-spend.md | _archive/problems/04-advanced/02-running-spend.md |

Remove the directories left empty (`01-basics`, `02-joins`, `03-aggregation`, `04-advanced`) only after checking they really are empty (`ls`).

- [ ] **Step 2: Create** `problems/01-select/04-young-customers-abroad.md`:

```markdown
---
id: young-customers-abroad
title: Young Customers Abroad
chapter: SELECT
order: 4
difficulty: Easy
dataset: shop
check: rows-unordered
---

Marketing is planning a student campaign outside the USA and needs its audience.

## Task
Return the `name` and `country` of every customer younger than 30 who does not live in the USA. Customers with no recorded age are not included. The order does not matter.

## Hint
- Combine two conditions with `AND`.
- `age < 30` is never true when `age` is `NULL`.

## Solution
```sql
SELECT name, country FROM users WHERE age < 30 AND country <> 'USA';
```
```

- [ ] **Step 3: Create** `problems/01-select/05-short-product-names.md`:

```markdown
---
id: short-product-names
title: Short Product Names
chapter: SELECT
order: 5
difficulty: Easy
dataset: shop
check: rows-unordered
---

The new shelf labels only fit 10 characters, so the store needs to know which products already fit.

## Task
Return the `id` and `name` of every product whose name is at most 10 characters long. The order does not matter.

## Hint
- `LENGTH(text)` counts characters.

## Solution
```sql
SELECT id, name FROM products WHERE LENGTH(name) <= 10;
```
```

- [ ] **Step 4: Create** `problems/03-easy-challenges/01-busy-managers.md`:

```markdown
---
id: busy-managers
title: Busy Managers
chapter: Easy Challenges
order: 1
difficulty: Medium
dataset: shop
check: rows-unordered
---

HR wants to check that nobody manages too many people on their own.

## Task
Return the `name` of every employee who has at least 2 direct reports: employees whose `manager_id` is their `id`. The order does not matter.

## Example
| name |
|---|
| Kavya Rao |

## Hint
- Group the employees by `manager_id` and keep groups with `COUNT(*) >= 2`.
- Join back to `employees` to get the manager's name.

## Solution
```sql
SELECT m.name
FROM employees e JOIN employees m ON m.id = e.manager_id
GROUP BY m.id, m.name
HAVING COUNT(*) >= 2;
```
```

- [ ] **Step 5: Run** `npm run check-content`. Expected: `✓ sql: 70 item(s) checked, 0 problem(s)`.
  - If a new problem's solution returns no rows, adjust its threshold (and the task text) until it returns 1–6 rows.
  - Make the Busy Managers `## Example` table match the real output of the solution.

- [ ] **Step 6: No commit** (user rule).

---

### Task 12: Lab shape test, e2e updates, visual check

**Files:**
- Create: `scripts/sqlLabShape.test.ts`
- Modify: `e2e/lab.spec.ts`

- [ ] **Step 1: Write the shape test** `scripts/sqlLabShape.test.ts`:

```ts
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadLabFromDir } from '@codeadda/content-loader/node';

const lab = loadLabFromDir(resolve(import.meta.dirname, '../content/sql'));
const lessons = lab.lessons.flatMap((c) => c.items);

describe('SQL lab shape (matches the reference structure)', () => {
  it('has no content errors', () => expect(lab.errors).toEqual([]));

  it('has 11 chapters and 62 lessons with the reference counts', () => {
    expect(lab.lessons.map((c) => [c.title, c.items.length])).toEqual([
      ['Querying Data', 5], ['Sorting Data', 3], ['Filtering Data', 10], ['Joining Tables', 7], ['Grouping Data', 6],
      ['Subqueries', 3], ['Set Operators', 2], ['Modifying Data', 10], ['Common Table Expressions', 4],
      ['Advanced Topics', 6], ['Data Types & Constraints', 6],
    ]);
  });

  it('starts and ends with the reference titles', () => {
    expect(lessons[0]!.title).toBe('SELECT All Columns');
    expect(lessons[38]!.title).toBe('INSERT with Specific Columns');
    expect(lessons[42]!.title).toBe('UPDATE with JOIN');
    expect(lessons[61]!.title).toBe('FOREIGN KEY Constraint');
  });

  it('animates exactly the 22 reference lessons', () => {
    const animated = lessons.flatMap((l, i) => (l.steps ? [i + 1] : []));
    expect(animated).toEqual([1, 2, 6, 9, 17, 18, 19, 20, 21, 22, 26, 30, 31, 32, 35, 36, 37, 42, 47, 51, 57, 62]);
  });

  it('gives every lesson a Context section', () => {
    expect(lessons.filter((l) => !l.context).map((l) => l.id)).toEqual([]);
  });

  it('has 3 LeetLab groups with 5, 2 and 1 problems', () => {
    expect(lab.problems.map((c) => [c.title, c.items.length])).toEqual([['SELECT', 5], ['Basic Joins', 2], ['Easy Challenges', 1]]);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run scripts/sqlLabShape.test.ts`. Expected: PASS. A failure here means one of Tasks 8–11 is incomplete; fix the content, not the test.

- [ ] **Step 3: Update `e2e/lab.spec.ts`:**
  - `openFirstLesson`: look for the heading `SELECT All Columns` and the button `Run Query`.
  - Every `getByRole('button', { name: 'Run', exact: true })` becomes `getByRole('button', { name: 'Run Query' })`.
  - The completion link regex becomes `/SELECT All Columns/`.
  - In the Reset DB test, `getByRole('tab', { name: 'Schema' })` becomes `getByRole('tab', { name: 'Database Schema' })`, and the reviews check becomes `page.getByRole('button', { name: /^reviews/ }).first()`, because the schema now also appears in the bottom section.
  - The mobile test navigates to `/SELECT Specific Columns/`, and expects the heading `SELECT Specific Columns`.
  - Append these tests:

```ts
test('the Watch it happen player plays to the end', async ({ page }) => {
  await openFirstLesson(page);
  const player = page.getByRole('group', { name: 'Watch it happen' });
  await expect(player).toBeVisible();
  await player.getByRole('button', { name: 'Next step' }).click();
  await expect(player.getByRole('button', { name: 'A row' })).toHaveAttribute('aria-current', 'step');
  const labels = player.getByRole('listitem');
  await labels.last().getByRole('button').click();
  await expect(player.getByRole('button', { name: 'Replay' })).toBeVisible();
  await expect(player.getByRole('button', { name: 'Next step' })).toBeDisabled();
});

test('the sidebar marks animated lessons and all chapters are open', async ({ page }) => {
  await openFirstLesson(page);
  const sidebar = page.getByRole('complementary', { name: 'Lesson list' });
  await expect(sidebar.getByRole('heading', { name: 'The SQL Codex' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: /SELECT All Columns/ }).getByLabel('has animation')).toBeVisible();
  await expect(sidebar.getByRole('link', { name: /FOREIGN KEY Constraint/ })).toBeAttached();
});

test('the page never scrolls sideways on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto('/sql/lessons/foreign-key');
  await expect(page.getByRole('group', { name: 'Watch it happen' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
```

  Check the real id of lesson 62 with `grep "^id:" content/sql/lessons/11-types-constraints/06-foreign-key.md`, and use it in the URL.

- [ ] **Step 4: Run** `npm run typecheck`, `npm test`, `npm run check-content` and `npm run e2e`. Expected: all green. Run e2e twice to catch flakiness.

  If the narrow-screen test fails, the cause is almost always a missing `min-w-0` on a flex child or a missing `overflow-x-auto` on the player stage, the schema table or the results table. Fix the layout; don't weaken the test.

- [ ] **Step 5: Visual check against the reference.** With `npm run dev` running, use the chrome-devtools MCP or Playwright to take 1920×1000 screenshots of each of these, in light and dark themes, into the scratchpad:
  - lesson 1 (top of the page),
  - lesson 1 scrolled to the output card and schema section,
  - lesson 62 (player at step 5).

  Compare them side by side with the reference screenshots in `C:\Users\JAYDEE~1.KAN\AppData\Local\Temp\claude\C--Users-Jaydeep-Kan1515\29e6f86e-f903-4f64-b005-f06a54204180\scratchpad\snag\*\{*}.png`.

  Fix spacing, size or colour differences that are clearly visible. List any you deliberately leave, such as branding, in the final report.

- [ ] **Step 6: Build check.** Run `npm run build`. Expected: success. Report the main bundle size; the 4.8 MB Monaco concern from Stage 1 is known and out of scope.

- [ ] **Step 7: No commit** (user rule). Write a short report to `.superpowers/sdd/2026-09-30-sql-lab-chai-match/final-report.md`: what was done, test counts, differences from the screenshots that were left, and the bundle size.
