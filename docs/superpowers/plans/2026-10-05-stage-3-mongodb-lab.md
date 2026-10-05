# Stage 3: MongoDB Lab — Implementation Plan (v2)

> **For agentic workers:** implement task by task, in order (1 → 14). Code tasks are test-first: write the test, run it and see it fail for the expected reason, implement, run it and see it pass. Steps use `- [ ]`.

**Goal:** A self-contained, offline MongoDB lab at `/mongodb` (15 chapters, 40 lessons, 12 problems, beginner → advanced) on a fictional streaming dataset, powered by a new in-browser engine on `mingo`, with a Table/Documents results view and MongoDB-aware editor and schema panel.

**Architecture:** New package `@codeadda/engine-mongo-sim` (parser + engine on mingo) implements the existing `Engine` interface. The web app routes engines per language (one worker file per engine); a `labUi(language)` config holds every language-specific label. Content lives in `content/mongodb/` and flows through the existing lazy content plugin unchanged. `check-content` gets a per-language engine map.

**Spec (binding):** `docs/superpowers/specs/2026-10-05-stage-3-mongodb-lab-design.md` (v2).

## Global Constraints
- **No git commits, adds, stashes, pushes or branch changes.** Stay on `feature/stage-3-mongodb-lab`.
- Exactly one new npm dependency: `mingo` **7.2.4** (pinned `"mingo": "7.2.4"`) in `packages/engine-mongo-sim/package.json`. Nothing else.
- Don't touch `content/sql/**`, `content/postgres/**`, or the PGlite engine package.
- No `dark:` utilities, no raw hex outside `apps/web/src/styles/tokens.css`, no external URLs (e2e aborts non-localhost requests).
- Content is original, fictional (no real films, actors, ratings, trademarked characters); no "Chai".
- The home page entry bundle must not grow: the Mongo engine and lab content load only when the MongoDB lab opens.
- A dev server on 5173 may belong to the owner — never stop it; use 5197 for anything you start; **don't edit files while `npm run e2e` runs**.
- Verify with: `npm run typecheck`, `npx vitest run <files>`, `npm test`, `npm run check-content`, `npm run e2e`, `npm run build -w @codeadda/web`.

## Review Focus
1. **Field order:** a correct answer whose projection/`$project`/`$group` lists fields in a different order must pass. Pinned in Task 3 (engine) and Task 12 (`mongoChecks.test.ts`).
2. **Inserts without `_id`:** the learner's insert and the solution's insert must produce the same ids. Pinned in Task 3.
3. **No-op answers:** `db.movies.find({}).limit(0)` or `db.users.countDocuments()` must not pass any `state` lesson. Pinned in Task 12.
4. **Unsupported input** (`new Date()`, `function(){}`, `$where`, `$out`, two statements) gives a clear message with a position, never a crash or a hang. Pinned in Tasks 2–3.
5. **The SQL and PostgreSQL labs are unchanged** (editor still SQL, starter text, sidebar subtitle, all their tests). Pinned in Task 5 and the full e2e run.

---

### Task 1: Core — nested key order and `documents`

**Files:** Modify `packages/core/src/compare.ts`, `packages/core/src/types.ts`; Test `packages/core/src/compare.test.ts`.

- [ ] **Step 1: failing tests** (append to `compare.test.ts`):
```ts
describe('normalizeCell with nested objects', () => {
  it('ignores key order inside objects and nested arrays of objects', () => {
    expect(normalizeCell({ a: 1, b: { c: 2, d: 3 } })).toEqual(normalizeCell({ b: { d: 3, c: 2 }, a: 1 }));
    expect(normalizeCell([{ x: 1, y: 2 }])).toEqual(normalizeCell([{ y: 2, x: 1 }]));
  });
  it('still tells different values apart', () => {
    expect(normalizeCell({ a: 1 })).not.toEqual(normalizeCell({ a: 2 }));
    expect(normalizeCell([1, 2])).not.toEqual(normalizeCell([2, 1]));
  });
});
```
- [ ] **Step 2:** `npx vitest run packages/core/src/compare.test.ts` → the first test FAILS.
- [ ] **Step 3:** in `compare.ts` add and use:
```ts
/** Objects compare by content, not key order (MongoDB/JSON semantics). Array order still matters. */
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
    const o = v as Record<string, unknown>;
    return Object.fromEntries(Object.keys(o).sort().map((k) => [k, sortKeys(o[k])]));
  }
  return v;
}
```
and change the object branch of `normalizeCell` to `return JSON.stringify(sortKeys(v));`. In `types.ts` add to `QuerySuccess`: `/** Raw documents (MongoDB labs), for the Documents view. */ documents?: unknown[];`.
- [ ] **Step 4:** `npx vitest run packages/core && npm run typecheck` → PASS (all existing core tests too).

---

### Task 2: Package + mongosh parser

**Files:** Create `packages/engine-mongo-sim/package.json`, `src/parser.ts`, `src/parser.test.ts`, `src/index.ts`.

- [ ] **Step 1:** `packages/engine-mongo-sim/package.json`:
```json
{
  "name": "@codeadda/engine-mongo-sim",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": { "@codeadda/core": "*", "mingo": "7.2.4" }
}
```
Run `npm install` at the root (links the workspace, adds mingo to the lockfile).
- [ ] **Step 2: failing tests** — `src/parser.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { MongoParseError, parseMongosh } from './parser';

describe('parseMongosh', () => {
  it('parses a find with filter, projection and a cursor chain', () => {
    expect(parseMongosh(`db.movies.find({ year: { $gte: 2000 }, 'details.country': "Norway" }, { title: 1, _id: 0 }).sort({ year: -1 }).skip(2).limit(5);`)).toEqual({
      collection: 'movies', method: 'find',
      args: [{ year: { $gte: 2000 }, 'details.country': 'Norway' }, { title: 1, _id: 0 }],
      chain: [{ name: 'sort', args: [{ year: -1 }] }, { name: 'skip', args: [2] }, { name: 'limit', args: [5] }],
    });
  });

  it('accepts comments, trailing commas, negative/decimal numbers, escapes, null and booleans', () => {
    const c = parseMongosh(`// my query\ndb.users.insertOne({ name: 'O\\'Neil', score: -1.5e1, ok: true, gone: null, tags: ['a', 'b',], /* note */ })`);
    expect(c.args[0]).toEqual({ name: "O'Neil", score: -15, ok: true, gone: null, tags: ['a', 'b'] });
  });

  it('turns /regex/flags into a RegExp', () => {
    const f = parseMongosh('db.reviews.find({ comment: /twist/i })').args[0] as { comment: RegExp };
    expect(f.comment).toBeInstanceOf(RegExp);
    expect(f.comment.source).toBe('twist');
    expect(f.comment.flags).toBe('i');
  });

  it('parses every supported method', () => {
    for (const m of ['find', 'findOne', 'aggregate', 'countDocuments', 'distinct', 'insertOne', 'insertMany', 'updateOne', 'updateMany', 'replaceOne', 'deleteOne', 'deleteMany']) {
      expect(parseMongosh(`db.c.${m}()`).method).toBe(m);
    }
  });

  it('rejects code, unknown methods and extra statements with a position', () => {
    for (const bad of ['db.c.find({ t: new Date() })', 'db.c.find({ f: function () {} })', 'db.c.find(x => x)', 'db.c.drop()', 'db.c.find(); db.c.find()', 'movies.find()', 'db.c.aggregate([]).sort({a:1})', 'db.c.find({ a: `x` })']) {
      expect(() => parseMongosh(bad), bad).toThrow(MongoParseError);
    }
    try { parseMongosh('db.c.find({ t: ISODate("2020") })'); } catch (e) {
      expect(e).toBeInstanceOf(MongoParseError);
      expect((e as MongoParseError).position).toBe(16);
      expect((e as Error).message).toMatch(/ISODate/);
    }
  });

  it('never lets a key reach the object prototype', () => {
    const o = parseMongosh('db.c.insertOne({ "__proto__": { polluted: 1 } })').args[0] as Record<string, unknown>;
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.keys(o)).toEqual(['__proto__']);
  });
});
```
- [ ] **Step 3:** `npx vitest run packages/engine-mongo-sim/src/parser.test.ts` → FAIL (module not found).
- [ ] **Step 4: implement** `src/parser.ts`:
```ts
export type Method = 'find' | 'findOne' | 'aggregate' | 'countDocuments' | 'distinct' | 'insertOne' | 'insertMany' | 'updateOne' | 'updateMany' | 'replaceOne' | 'deleteOne' | 'deleteMany';
export type ChainName = 'sort' | 'skip' | 'limit' | 'pretty' | 'toArray';
export interface MongoCall { collection: string; method: Method; args: unknown[]; chain: { name: ChainName; args: unknown[] }[] }

/** A syntax error; `position` is 1-based, like PostgreSQL's error positions. */
export class MongoParseError extends Error {
  constructor(message: string, readonly position: number) { super(message); this.name = 'MongoParseError'; }
}

const METHODS = new Set<string>(['find', 'findOne', 'aggregate', 'countDocuments', 'distinct', 'insertOne', 'insertMany', 'updateOne', 'updateMany', 'replaceOne', 'deleteOne', 'deleteMany']);
const CHAIN = new Set<string>(['sort', 'skip', 'limit', 'pretty', 'toArray']);
const IDENT = /[A-Za-z_$][\w$]*/y;
const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
const PLAIN = 'Use plain values: "text", numbers, true, false, null, { objects }, [ arrays ] or /regex/.';

export function parseMongosh(src: string): MongoCall {
  return new Parser(src).statement();
}

class Parser {
  private i = 0;
  constructor(private readonly s: string) {}

  private fail(message: string, at = this.i): never { throw new MongoParseError(message, at + 1); }

  private ws(): void {
    for (;;) {
      while (this.i < this.s.length && /\s/.test(this.s[this.i]!)) this.i++;
      if (this.s.startsWith('//', this.i)) { const n = this.s.indexOf('\n', this.i); this.i = n === -1 ? this.s.length : n; continue; }
      if (this.s.startsWith('/*', this.i)) { const n = this.s.indexOf('*/', this.i + 2); if (n === -1) this.fail('Unclosed /* comment'); this.i = n + 2; continue; }
      return;
    }
  }
  private peek(): string | undefined { this.ws(); return this.s[this.i]; }
  private eat(ch: string): void { if (this.peek() !== ch) this.fail(this.i >= this.s.length ? `Expected "${ch}" but the query ended` : `Expected "${ch}"`); this.i++; }
  private match(re: RegExp): string | undefined { this.ws(); re.lastIndex = this.i; const m = re.exec(this.s); if (!m) return undefined; this.i = re.lastIndex; return m[0]; }
  private ident(what: string): { name: string; at: number } { const at = (this.ws(), this.i); const name = this.match(IDENT); if (!name) this.fail(`Expected ${what}`, at); return { name, at }; }

  statement(): MongoCall {
    const db = this.ident('db');
    if (db.name !== 'db') this.fail('Queries start with db, for example db.movies.find()', db.at);
    this.eat('.');
    const collection = this.ident('a collection name').name;
    this.eat('.');
    const m = this.ident('a method such as find');
    if (!METHODS.has(m.name)) this.fail(`"${m.name}" isn't supported in this lab. Try find, findOne, aggregate, countDocuments, distinct, insertOne, insertMany, updateOne, updateMany, replaceOne, deleteOne or deleteMany.`, m.at);
    const args = this.args();
    const chain: MongoCall['chain'] = [];
    while (this.peek() === '.') {
      this.i++;
      const c = this.ident('a cursor method such as sort');
      if (m.name !== 'find' || !CHAIN.has(c.name)) this.fail(`.${c.name}() can't be used here. After find() you can use .sort(), .skip(), .limit(), .pretty() or .toArray().`, c.at);
      chain.push({ name: c.name as ChainName, args: this.args() });
    }
    if (this.peek() === ';') this.i++;
    if (this.peek() !== undefined) this.fail('Run one statement at a time');
    return { collection, method: m.name as Method, args, chain };
  }

  private args(): unknown[] {
    this.eat('(');
    const out: unknown[] = [];
    if (this.peek() === ')') { this.i++; return out; }
    for (;;) {
      out.push(this.value());
      if (this.peek() === ',') { this.i++; if (this.peek() === ')') { this.i++; return out; } continue; }
      this.eat(')');
      return out;
    }
  }

  private value(): unknown {
    const c = this.peek();
    if (c === '{') return this.object();
    if (c === '[') return this.array();
    if (c === '"' || c === "'") return this.string();
    if (c === '/') return this.regex();
    if (c === '-' || (c !== undefined && /[\d.]/.test(c))) { const at = this.i; const n = this.match(NUMBER); if (n === undefined) this.fail('Expected a number', at); return Number(n); }
    const at = this.i;
    const word = this.match(IDENT);
    if (word === 'true') return true;
    if (word === 'false') return false;
    if (word === 'null') return null;
    if (word) this.fail(`"${word}" isn't supported here. ${PLAIN}`, at);
    if (c === undefined) this.fail('The query ended too early');
    this.fail(`Unexpected "${c}". ${PLAIN}`);
  }

  private object(): Record<string, unknown> {
    this.eat('{');
    const o: Record<string, unknown> = {};
    if (this.peek() === '}') { this.i++; return o; }
    for (;;) {
      const c = this.peek();
      const key = c === '"' || c === "'" ? this.string() : this.ident('a field name').name;
      this.eat(':');
      // defineProperty, not o[key] = …, so a "__proto__" key stays a plain field.
      Object.defineProperty(o, key, { value: this.value(), enumerable: true, writable: true, configurable: true });
      if (this.peek() === ',') { this.i++; if (this.peek() === '}') { this.i++; return o; } continue; }
      this.eat('}');
      return o;
    }
  }

  private array(): unknown[] {
    this.eat('[');
    const a: unknown[] = [];
    if (this.peek() === ']') { this.i++; return a; }
    for (;;) {
      a.push(this.value());
      if (this.peek() === ',') { this.i++; if (this.peek() === ']') { this.i++; return a; } continue; }
      this.eat(']');
      return a;
    }
  }

  private string(): string {
    const q = this.s[this.i]!;
    const start = this.i++;
    let out = '';
    while (this.i < this.s.length) {
      const ch = this.s[this.i++]!;
      if (ch === q) return out;
      if (ch === '\n') break;
      if (ch !== '\\') { out += ch; continue; }
      const e = this.s[this.i++];
      if (e === 'u') { const hex = this.s.slice(this.i, this.i + 4); if (!/^[0-9a-fA-F]{4}$/.test(hex)) this.fail('Bad \\u escape'); out += String.fromCharCode(parseInt(hex, 16)); this.i += 4; }
      else out += ({ n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', '0': '\0' } as Record<string, string>)[e ?? ''] ?? e ?? '';
    }
    this.fail('This text is missing its closing quote', start);
  }

  private regex(): RegExp {
    const start = this.i++;
    let body = '';
    let inClass = false;
    while (this.i < this.s.length) {
      const ch = this.s[this.i++]!;
      if (ch === '\\') { body += ch + (this.s[this.i++] ?? ''); continue; }
      if (ch === '[') inClass = true; else if (ch === ']') inClass = false;
      else if (ch === '/' && !inClass) {
        const flags = this.match(/[gimsuy]*/y) ?? '';
        try { return new RegExp(body, flags); } catch (e) { this.fail(`Invalid regular expression: ${(e as Error).message}`, start); }
      } else if (ch === '\n') break;
      body += ch;
    }
    this.fail('This /regex/ is missing its closing /', start);
  }
}
```
(Note on the ISODate test: in `db.c.find({ t: ISODate("2020") })` the word starts at index 15, so the 1-based position is 16.)
- [ ] **Step 5:** `src/index.ts`: `export { MongoParseError, parseMongosh, type MongoCall } from './parser';` (the engine export is added in Task 3).
- [ ] **Step 6:** parser tests → PASS; `npm run typecheck` clean.

---

### Task 3: `MongoSimEngine` (+ correct `$bucket`)

**Files:** Create `packages/engine-mongo-sim/src/bucket.ts`, `src/MongoSimEngine.ts`, `src/MongoSimEngine.test.ts`, `src/bucket.test.ts`; Modify `src/index.ts`.

- [ ] **Step 1: failing tests** — `src/bucket.test.ts`:
```ts
import { aggregate } from 'mingo';
import { describe, expect, it } from 'vitest';
import { rewriteBuckets } from './bucket';

const docs = [1990, 1995, 2000, 2004, 2010, 2015, 2030].map((y, i) => ({ _id: i, y }));
const run = (stage: object) => aggregate(docs, rewriteBuckets([stage]) as object[]);

describe('$bucket (MongoDB semantics, not mingo 7.2.4)', () => {
  it('puts values in [lower, upper), drops empty buckets, sorts by boundary, default last', () => {
    expect(run({ $bucket: { groupBy: '$y', boundaries: [1990, 2000, 2010, 2020, 2025], default: 'Later', output: { ys: { $push: '$y' } } } })).toEqual([
      { _id: 1990, ys: [1990, 1995] },
      { _id: 2000, ys: [2000, 2004] },
      { _id: 2010, ys: [2010, 2015] },
      { _id: 'Later', ys: [2030] },
    ]);
  });
  it('counts by default', () => {
    expect(run({ $bucket: { groupBy: '$y', boundaries: [1990, 2040] } })).toEqual([{ _id: 1990, count: 7 }]);
  });
  it('fails like MongoDB when a value is outside the boundaries and there is no default', () => {
    expect(() => run({ $bucket: { groupBy: '$y', boundaries: [2000, 2010] } })).toThrow(/\$bucket could not find a matching branch/);
  });
  it('rejects bad boundaries', () => {
    expect(() => rewriteBuckets([{ $bucket: { groupBy: '$y', boundaries: [2010, 2000] } }])).toThrow(/ascending/);
    expect(() => rewriteBuckets([{ $bucket: { groupBy: '$y', boundaries: [2000] } }])).toThrow(/at least two/);
  });
  it('leaves other stages alone and rewrites $bucket inside $facet', () => {
    const p = rewriteBuckets([{ $match: { y: 1 } }, { $facet: { a: [{ $bucket: { groupBy: '$y', boundaries: [0, 9999] } }] } }]) as Record<string, unknown>[];
    expect(p[0]).toEqual({ $match: { y: 1 } });
    expect(JSON.stringify(p[1])).not.toContain('$bucket"');
  });
});
```
`src/MongoSimEngine.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { MongoSimEngine } from './MongoSimEngine';

const data = JSON.stringify({
  _meta: { descriptions: { movies: 'Films' } },
  movies: [
    { _id: 1, title: 'Ash Line', year: 2010, genres: ['Drama'], ratings: { critics: 80, audience: 7.5 } },
    { _id: 2, title: 'Blue Hour', year: 2000, genres: ['Drama', 'Mystery'], ratings: { audience: 6.1 } },
  ],
  reviews: [{ _id: 501, movie_id: 1, rating: 9 }],
});
const setup = async () => { const e = new MongoSimEngine(); await e.setup({ name: 'stream', source: data }); return e; };
const ok = (r: unknown) => { const x = r as { ok: boolean }; if (!x.ok) throw new Error(JSON.stringify(r)); return r as { columns: string[]; rows: unknown[][]; documents?: unknown[]; rowCount: number }; };

describe('MongoSimEngine', () => {
  it('finds with canonical columns (_id first, then A→Z) and returns documents', async () => {
    const r = ok(await (await setup()).run('db.movies.find({ year: { $gt: 2005 } }, { year: 1, title: 1 })'));
    expect(r.columns).toEqual(['_id', 'title', 'year']);
    expect(r.rows).toEqual([[1, 'Ash Line', 2010]]);
    expect(r.documents).toEqual([{ _id: 1, title: 'Ash Line', year: 2010 }]);
  });

  it('gives the same columns whatever order the projection or $group lists fields', async () => {
    const e = await setup();
    const a = ok(await e.run('db.movies.aggregate([{ $group: { _id: null, n: { $sum: 1 }, avg: { $avg: "$year" } } }])'));
    const b = ok(await e.run('db.movies.aggregate([{ $group: { _id: null, avg: { $avg: "$year" }, n: { $sum: 1 } } }])'));
    expect(a.columns).toEqual(['_id', 'avg', 'n']);
    expect(b).toMatchObject({ columns: a.columns, rows: a.rows });
  });

  it('applies sort → skip → limit whatever order they are written', async () => {
    const e = await setup();
    const a = ok(await e.run('db.movies.find().limit(1).sort({ year: 1 })'));
    expect(a.rows[0]![0]).toBe(2);
  });

  it('joins with $lookup across collections', async () => {
    const r = ok(await (await setup()).run('db.movies.aggregate([{ $lookup: { from: "reviews", localField: "_id", foreignField: "movie_id", as: "r" } }, { $project: { n: { $size: "$r" } } }])'));
    expect(r.rows).toEqual([[1, 1], [2, 0]]);
  });

  it('counts, and lists distinct values flattened and sorted', async () => {
    const e = await setup();
    expect(ok(await e.run('db.movies.countDocuments({ year: { $gte: 2000 } })'))).toMatchObject({ columns: ['count'], rows: [[2]] });
    expect(ok(await e.run('db.movies.distinct("genres")'))).toMatchObject({ columns: ['value'], rows: [['Drama'], ['Mystery']] });
  });

  it('inserts with deterministic ids, rejects duplicate ids, and resets', async () => {
    const e = await setup();
    expect(ok(await e.run('db.movies.insertOne({ title: "C" })')).rows[0]).toEqual([true, 3]);
    expect(ok(await e.run('db.movies.insertMany([{ title: "D" }, { _id: "x", title: "E" }])')).documents).toEqual([{ acknowledged: true, insertedCount: 2, insertedIds: [4, 'x'] }]);
    expect(await e.run('db.movies.insertOne({ _id: 1, title: "dup" })')).toMatchObject({ ok: false, error: { message: expect.stringMatching(/E11000 duplicate key/) } });
    await e.reset();
    expect(ok(await e.run('db.movies.countDocuments()')).rows).toEqual([[2]]);
    const fresh = await setup();
    expect(ok(await fresh.run('db.movies.insertOne({ title: "C" })')).rows[0]).toEqual([true, 3]);
  });

  it('updates (incl. positional $), replaces and deletes', async () => {
    const e = await setup();
    expect(ok(await e.run('db.movies.updateMany({}, { $inc: { year: 1 }, $push: { genres: "New" } })')).documents).toEqual([{ acknowledged: true, matchedCount: 2, modifiedCount: 2 }]);
    await e.run('db.movies.updateOne({ genres: "Mystery" }, { $set: { "genres.$": "Noir" } })');
    expect(ok(await e.run('db.movies.findOne({ _id: 2 })')).documents![0]).toMatchObject({ year: 2001, genres: ['Drama', 'Noir', 'New'] });
    await e.run('db.movies.replaceOne({ _id: 1 }, { title: "Only" })');
    expect(ok(await e.run('db.movies.findOne({ _id: 1 })')).documents![0]).toEqual({ _id: 1, title: 'Only' });
    expect(ok(await e.run('db.movies.deleteMany({ year: { $gt: 2000 } })')).documents).toEqual([{ acknowledged: true, deletedCount: 1 }]);
  });

  it('blocks code execution, pipeline writes, upserts and replacement-style updates with clear messages', async () => {
    const e = await setup();
    for (const q of [
      'db.movies.find({ $where: "1" })',
      'db.movies.aggregate([{ $out: "x" }])',
      'db.movies.aggregate([{ $merge: { into: "x" } }])',
      'db.movies.aggregate([{ $group: { _id: null, f: { $accumulator: {} } } }])',
      'db.movies.updateOne({}, { $set: { a: 1 } }, { upsert: true })',
      'db.movies.updateOne({}, [{ $set: { a: 1 } }])',
      'db.movies.updateOne({}, { title: "x" })',
    ]) {
      const r = await e.run(q);
      expect(r.ok, q).toBe(false);
    }
  });

  it('reports parser errors with a position', async () => {
    expect(await (await setup()).run('db.movies.find({ t: new Date() })')).toMatchObject({ ok: false, error: { position: 21 } });
  });

  it('describes collections for the schema panel', async () => {
    const s = await (await setup()).describe();
    const movies = s.tables.find((t) => t.name === 'movies')!;
    expect(movies).toMatchObject({ rowCount: 2, description: 'Films', sampleQuery: 'db.movies.find().limit(3)' });
    expect(movies.columns.find((c) => c.name === '_id')).toMatchObject({ type: 'number', isPrimary: true });
    expect(movies.columns.find((c) => c.name === 'genres')).toMatchObject({ type: 'array', nullable: false });
    expect(s.tables.map((t) => t.name)).toEqual(['movies', 'reviews']);
    expect(s.relationships).toEqual([]);
  });

  it('snapshot reads like run; a missing collection reads as empty', async () => {
    const e = await setup();
    expect(ok(await e.snapshot('db.nothing.find()'))).toMatchObject({ rows: [], rowCount: 0 });
  });
});
```
- [ ] **Step 2:** `npx vitest run packages/engine-mongo-sim` → both new files FAIL.
- [ ] **Step 3: implement** `src/bucket.ts`:
```ts
type Stage = Record<string, unknown>;
const NONE = '__codeadda_outside_buckets__';

/** mingo 7.2.4's $bucket uses (lower, upper] and keeps empty buckets; MongoDB uses [lower, upper) and drops them. */
export function rewriteBuckets(pipeline: unknown[]): unknown[] {
  return pipeline.flatMap((s) => {
    const stage = s as Stage;
    if (stage.$facet && typeof stage.$facet === 'object') {
      return [{ $facet: Object.fromEntries(Object.entries(stage.$facet as Record<string, unknown[]>).map(([k, p]) => [k, rewriteBuckets(p)])) }];
    }
    if (!stage.$bucket) return [stage];
    const { groupBy, boundaries, default: def, output } = stage.$bucket as { groupBy: unknown; boundaries: unknown[]; default?: unknown; output?: Record<string, unknown> };
    if (!Array.isArray(boundaries) || boundaries.length < 2) throw new Error('$bucket needs at least two boundaries');
    for (let i = 1; i < boundaries.length; i++) if (!((boundaries[i] as number) > (boundaries[i - 1] as number))) throw new Error('$bucket boundaries must be in ascending order');
    const branches = boundaries.slice(0, -1).map((lo, i) => ({ case: { $and: [{ $gte: [groupBy, lo] }, { $lt: [groupBy, boundaries[i + 1]] }] }, then: lo }));
    const fallback = def === undefined ? NONE : def;
    return [
      { $group: { _id: { $switch: { branches, default: fallback } }, ...(output ?? { count: { $sum: 1 } }) } },
      { $addFields: { __codeadda_order: { $cond: [{ $eq: ['$_id', fallback] }, 1, 0] } } },
      { $sort: { __codeadda_order: 1, _id: 1 } },
      { $project: { __codeadda_order: 0 } },
    ];
  });
}

export function assertNoOutsideBucket(docs: unknown[]): void {
  if (docs.some((d) => (d as { _id?: unknown })._id === NONE)) {
    throw new Error('$bucket could not find a matching branch for an input, and no default was specified.');
  }
}
```
(`assertNoOutsideBucket` is called by the engine on aggregate results; in `bucket.test.ts` the "fails like MongoDB" case needs the same check — wrap `run` so it calls `assertNoOutsideBucket(result)` before returning.)

`src/MongoSimEngine.ts` (complete the obvious helpers; keep the behaviour exactly as specified in spec §3):
```ts
import { aggregate, find, Query } from 'mingo';
import { updateMany, updateOne } from 'mingo/updater';
import type { ColumnInfo, Dataset, Engine, QueryResult, SchemaInfo, TableInfo } from '@codeadda/core';
import { assertNoOutsideBucket, rewriteBuckets } from './bucket';
import { MongoParseError, parseMongosh, type MongoCall } from './parser';

type Doc = Record<string, unknown>;
const BLOCKED: Record<string, string> = {
  $where: '$where runs JavaScript and is not supported in this lab.',
  $function: '$function runs JavaScript and is not supported in this lab.',
  $accumulator: '$accumulator runs JavaScript and is not supported in this lab.',
  $out: '$out writes to a collection and is not supported in this lab.',
  $merge: '$merge writes to a collection and is not supported in this lab.',
};

export class MongoSimEngine implements Engine {
  readonly kind = 'mongodb' as const;
  readonly mode = 'browser' as const;
  private pristine = new Map<string, Doc[]>();
  private data = new Map<string, Doc[]>();
  private descriptions: Record<string, string> = {};

  async setup(dataset: Dataset): Promise<void> {
    let parsed: unknown;
    try { parsed = JSON.parse(dataset.source); } catch (e) { throw new Error(`Dataset ${dataset.name} is not valid JSON: ${(e as Error).message}`); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`Dataset ${dataset.name} must be a JSON object of collections`);
    const { _meta, ...collections } = parsed as Record<string, unknown>;
    this.descriptions = ((_meta as { descriptions?: Record<string, string> } | undefined)?.descriptions) ?? {};
    this.pristine = new Map();
    for (const [name, docs] of Object.entries(collections)) {
      if (!Array.isArray(docs)) throw new Error(`Collection "${name}" in ${dataset.name} must be an array of documents`);
      this.pristine.set(name, structuredClone(docs) as Doc[]);
    }
    await this.reset();
  }

  async reset(): Promise<void> {
    this.data = new Map([...this.pristine].map(([k, v]) => [k, structuredClone(v)]));
  }

  async snapshot(query: string): Promise<QueryResult> { return this.run(query); }

  async run(query: string): Promise<QueryResult> {
    const t0 = performance.now();
    try {
      const call = parseMongosh(query);
      assertAllowed(call);
      const docs = this.execute(call);
      const columns = canonicalColumns(docs);
      const read = ['find', 'findOne', 'aggregate'].includes(call.method);
      return {
        ok: true, columns, rows: docs.map((d) => columns.map((c) => (c in d ? d[c] : null))), rowCount: docs.length,
        durationMs: Math.round(performance.now() - t0), documents: read ? docs : docs,
      };
    } catch (e) {
      const position = e instanceof MongoParseError ? e.position : undefined;
      return { ok: false, error: { message: (e as Error).message, ...(position ? { position } : {}) } };
    }
  }

  private coll(name: string, create = false): Doc[] {
    let c = this.data.get(name);
    if (!c) { c = []; if (create) this.data.set(name, c); }
    return c;
  }

  private execute({ collection, method, args, chain }: MongoCall): Doc[] {
    const c = this.coll(collection, method.startsWith('insert'));
    const [a0, a1, a2] = args as [Doc | undefined, Doc | undefined, Doc | undefined];
    switch (method) {
      case 'find':
      case 'findOne': {
        let cursor = find(c, a0 ?? {}, a1);
        const sort = chain.find((x) => x.name === 'sort')?.args[0] as Record<string, 1 | -1> | undefined;
        const skip = chain.find((x) => x.name === 'skip')?.args[0] as number | undefined;
        const limit = chain.find((x) => x.name === 'limit')?.args[0] as number | undefined;
        if (sort) cursor = cursor.sort(sort);
        if (skip) cursor = cursor.skip(skip);
        if (method === 'findOne') cursor = cursor.limit(1); else if (limit) cursor = cursor.limit(limit);
        return structuredClone(cursor.all() as Doc[]);
      }
      case 'aggregate': {
        if (!Array.isArray(a0)) throw new Error('aggregate() takes an array of stages, e.g. db.movies.aggregate([{ $match: {} }])');
        const out = aggregate(c, rewriteBuckets(a0) as Doc[], { collectionResolver: (n: string) => this.coll(n) }) as Doc[];
        assertNoOutsideBucket(out);
        return structuredClone(out);
      }
      case 'countDocuments': return [{ count: find(c, a0 ?? {}).count() }];
      case 'distinct': return distinctValues(c, String(a0 ?? ''), (a1 as Doc | undefined) ?? {}).map((value) => ({ value }));
      case 'insertOne': return [{ acknowledged: true, insertedId: this.insert(c, a0) }];
      case 'insertMany': {
        if (!Array.isArray(a0)) throw new Error('insertMany() takes an array of documents');
        const ids = a0.map((d) => this.insert(c, d as Doc));
        return [{ acknowledged: true, insertedCount: ids.length, insertedIds: ids }];
      }
      case 'updateOne':
      case 'updateMany': {
        checkUpdate(a1, a2);
        const fn = method === 'updateOne' ? updateOne : updateMany;
        const r = fn(c, a0 ?? {}, a1 as Doc) as { matchedCount: number; modifiedCount: number };
        return [{ acknowledged: true, matchedCount: r.matchedCount, modifiedCount: r.modifiedCount }];
      }
      case 'replaceOne': {
        if (!a1 || typeof a1 !== 'object' || Object.keys(a1).some((k) => k.startsWith('$'))) throw new Error('replaceOne() needs a replacement document without update operators');
        const q = new Query(a0 ?? {});
        const i = c.findIndex((d) => q.test(d));
        if (i === -1) return [{ acknowledged: true, matchedCount: 0, modifiedCount: 0 }];
        c[i] = { ...structuredClone(a1), _id: c[i]!._id };
        return [{ acknowledged: true, matchedCount: 1, modifiedCount: 1 }];
      }
      case 'deleteOne':
      case 'deleteMany': {
        const q = new Query(a0 ?? {});
        let deleted = 0;
        for (let i = 0; i < c.length; ) {
          if (q.test(c[i]!) && (method === 'deleteMany' || deleted === 0)) { c.splice(i, 1); deleted++; } else i++;
        }
        return [{ acknowledged: true, deletedCount: deleted }];
      }
    }
  }

  private insert(c: Doc[], doc: Doc | undefined): unknown {
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new Error('Insert a document, e.g. { name: "Asha" }');
    const d = structuredClone(doc);
    if (!('_id' in d)) d._id = c.reduce((m, x) => (typeof x._id === 'number' && x._id > m ? x._id : m), 0) + 1;
    if (c.some((x) => JSON.stringify(x._id) === JSON.stringify(d._id))) throw new Error(`E11000 duplicate key error: _id ${JSON.stringify(d._id)} already exists`);
    c.push(d);
    return d._id;
  }

  async describe(): Promise<SchemaInfo> {
    const tables: TableInfo[] = [...this.data.keys()].sort().map((name) => {
      const docs = this.data.get(name)!;
      const fields = canonicalColumns(docs);
      const columns: ColumnInfo[] = fields.map((f) => {
        const types = new Set(docs.filter((d) => d[f] !== undefined && d[f] !== null).map((d) => typeOf(d[f])));
        return { name: f, type: types.size === 1 ? [...types][0]! : types.size === 0 ? 'null' : 'mixed', nullable: docs.some((d) => d[f] === undefined || d[f] === null), isPrimary: f === '_id', isForeign: false };
      });
      return { name, description: this.descriptions[name], rowCount: docs.length, columns, sampleQuery: `db.${name}.find().limit(3)` };
    });
    return { tables, relationships: [] };
  }

  async dispose(): Promise<void> { this.data.clear(); this.pristine.clear(); }
}

/** `_id` first, then every other top-level field A→Z (MongoDB field order is not meaningful to the grader). */
export function canonicalColumns(docs: Doc[]): string[] {
  const keys = new Set<string>();
  for (const d of docs) for (const k of Object.keys(d)) keys.add(k);
  const rest = [...keys].filter((k) => k !== '_id').sort();
  return keys.has('_id') ? ['_id', ...rest] : rest;
}

function typeOf(v: unknown): string {
  if (Array.isArray(v)) return 'array';
  if (v instanceof RegExp) return 'regex';
  return typeof v === 'object' ? 'document' : typeof v;
}

function assertAllowed(call: MongoCall): void {
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (v && typeof v === 'object' && !(v instanceof RegExp)) {
      for (const [k, x] of Object.entries(v)) { if (BLOCKED[k]) throw new Error(BLOCKED[k]); walk(x); }
    }
  };
  walk(call.args);
}

function checkUpdate(update: unknown, options: unknown): void {
  if (Array.isArray(update)) throw new Error('Pipeline-style updates are not supported in this lab; use operators such as $set.');
  if (!update || typeof update !== 'object' || !Object.keys(update).every((k) => k.startsWith('$'))) throw new Error('Use replaceOne to replace a whole document, or an update operator such as $set.');
  if (options && typeof options === 'object' && (options as Doc).upsert) throw new Error('upsert is not supported in this lab.');
}

function distinctValues(c: Doc[], field: string, filter: Doc): unknown[] {
  const seen = new Map<string, unknown>();
  const add = (v: unknown) => { if (v !== undefined) seen.set(JSON.stringify(v), v); };
  for (const d of find(c, filter).all() as Doc[]) {
    const v = field.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Doc)[k] : undefined), d);
    if (Array.isArray(v)) v.forEach(add); else add(v);
  }
  const rank = (v: unknown) => (typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : 2);
  return [...seen.values()].sort((a, b) => rank(a) - rank(b) || (typeof a === 'number' && typeof b === 'number' ? a - b : String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0));
}
```
(If a mingo 7.2.4 API differs from these calls — e.g. `find(...).count()` or the updater's return value — adapt and keep the tests' observable behaviour; log a ruling. Simplify `documents: read ? docs : docs` to `documents: docs`. The insert-row assertion `[true, 3]` relies on canonical columns `acknowledged, insertedId`.)
- [ ] **Step 4:** add `export { MongoSimEngine, canonicalColumns } from './MongoSimEngine';` to `src/index.ts`.
- [ ] **Step 5:** `npx vitest run packages/engine-mongo-sim && npm run typecheck` → PASS.

---

### Task 4: Engine routing (workers, Node map)

**Files:** Create `apps/web/src/engine/serve.ts`, `apps/web/src/engine/mongo.worker.ts`, `scripts/engines.ts`; Modify `apps/web/src/engine/engine.worker.ts`, `apps/web/src/engine/createEngine.ts`, `apps/web/package.json` (add `"@codeadda/engine-mongo-sim": "*"`), `scripts/check-content.ts`; Test `apps/web/src/engine/createEngine.test.ts` (new), `scripts/engines.test.ts` (new).

- [ ] **Step 1: failing tests** — `createEngine.test.ts`: mock `Worker` (a class recording the URL) and assert `createEngine('sql').kind === 'sql'` spawns a URL ending `engine.worker.ts`, `createEngine('mongodb')` spawns `mongo.worker.ts`, and `createEngine('redis')` throws `/No engine available for redis/`. `scripts/engines.test.ts`: `engineFor('sql')` is a `PgliteEngine`, `engineFor('mongodb')` a `MongoSimEngine`, `engineFor('redis')` is `undefined`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** `serve.ts` — move the body of today's `engine.worker.ts` into `export function serveEngine(engine: Engine): void { self.onmessage = … }`. `engine.worker.ts` becomes `serveEngine(new PgliteEngine());`, `mongo.worker.ts` is `serveEngine(new MongoSimEngine());`. `createEngine.ts`:
```ts
import type { Engine, LabLanguage } from '@codeadda/core';
import { WorkerEngine } from './WorkerEngine';

// One worker per engine, so a lab only downloads its own engine.
const WORKERS: Partial<Record<LabLanguage, () => Worker>> = {
  sql: () => new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' }),
  mongodb: () => new Worker(new URL('./mongo.worker.ts', import.meta.url), { type: 'module' }),
};

export function createEngine(language: LabLanguage): Engine {
  const spawn = WORKERS[language];
  if (!spawn) throw new Error(`No engine available for ${language} labs yet.`);
  return new WorkerEngine(spawn, language);
}
```
`scripts/engines.ts`: `export function engineFor(language: LabLanguage): Engine | undefined` returning `new PgliteEngine()` / `new MongoSimEngine()`. In `check-content.ts` replace the `language !== 'sql'` skip with `const engine = engineFor(lab.language); if (!engine) { console.log(\`- ${lab.id}: skipped (no ${lab.language} engine yet)\`); continue; }`. Run `npm install`.
- [ ] **Step 4:** tests PASS; `npm run typecheck` clean; `npm run check-content` still `sql 70` / `postgres 58`.

---

### Task 5: Language UI config, editor and labels

**Files:** Create `apps/web/src/lab/labUi.ts` (+ `labUi.test.ts`); Modify `apps/web/src/components/monacoSetup.ts`, `LessonFlow.tsx`, `ProblemWorkspace.tsx`, `components/Sidebar.tsx`, `components/SchemaViewer.tsx` (unit word), and any other place a string assumes SQL (grep `SQL` and `STARTER_SQL` in `apps/web/src`, excluding the SQL-themed home hero and tests).

- [ ] **Step 1: failing test** — `labUi.test.ts` asserts the table in spec §4 exactly for `sql` and `mongodb`, and that `labUi('redis')` falls back to the SQL values (until Stage 4).
- [ ] **Step 2: implement** `labUi.ts`:
```ts
import type { LabLanguage } from '@codeadda/core';

export interface LabUi { monaco: string; editorTitle: string; starter: string; skipPrompt: string; problemsSubtitle: string; unit: string }

const SQL: LabUi = { monaco: 'sql', editorTitle: 'SQL editor', starter: '-- Write your SQL query here\n', skipPrompt: 'Already know SQL?', problemsSubtitle: 'Original SQL challenges, easy to hard', unit: 'rows' };
const UI: Partial<Record<LabLanguage, LabUi>> = {
  sql: SQL,
  mongodb: { monaco: 'javascript', editorTitle: 'MongoDB shell', starter: '// Write your MongoDB query here\n', skipPrompt: 'Already know the MongoDB basics?', problemsSubtitle: 'Original MongoDB challenges, easy to hard', unit: 'documents' },
};

/** Every language-specific label in one place. */
export function labUi(language: LabLanguage): LabUi { return UI[language] ?? SQL; }
```
Use it: `LessonFlow`/`ProblemWorkspace` initial draft `?? labUi(lab.language).starter` and pass `language={ui.monaco} title={ui.editorTitle}` to `QueryEditor`; skip banner text `{ui.skipPrompt}`; `Sidebar` problems subtitle `labUi(lab.language).problemsSubtitle`; `SchemaViewer` row count uses `unit` (thread `lab.language` or the unit as a prop). Keep `STARTER_SQL` exported only if tests still import it; otherwise remove it. Update existing tests that assert these strings for SQL — they must still pass unchanged for SQL.
- [ ] **Step 3: Monaco** — `monacoSetup.ts`:
```ts
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker';
self.MonacoEnvironment = {
  // SQL uses only the base editor worker; MongoDB's javascript mode needs the TypeScript worker (loaded only when used).
  getWorker: (_id: string, label: string) => (label === 'typescript' || label === 'javascript' ? new TsWorker() : new EditorWorker()),
};
// Learners type mongosh, not a JS program: no squiggles under `db`.
monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: true });
```
(`monaco.languages.typescript` is marked deprecated in 0.57 but works; if the type isn't exposed, cast and log a ruling. Confirm `grep -rl jsdelivr apps/web/dist` still finds nothing after a build.)
- [ ] **Step 4:** `npx vitest run apps/web && npm run typecheck` → PASS (all existing SQL tests unchanged).

---

### Task 6: Results panel — Table | Documents

**Files:** Modify `apps/web/src/components/ResultsPanel.tsx`; Test `apps/web/src/components/ResultsPanel.test.tsx`.

- [ ] **Step 1: failing tests:** with a result that has `documents`, a `radiogroup`/tab-like control labelled "Results view" with "Table" (selected) and "Documents"; clicking Documents shows each document pretty-printed (`JSON.stringify(doc, null, 2)`, mono font) and hides the table; switching back shows the table; a result without `documents` (SQL) shows no toggle at all.
- [ ] **Step 2: implement:** segmented control using existing token classes (same look as the Lessons/LeetLab tabs, smaller); keyboard accessible (buttons with `aria-pressed`, or `role="radiogroup"` with arrow keys); state held in `useState` per panel (default Table). Documents view: a vertically scrolling list of cards, `font-mono text-sm`, max height consistent with the table's scroll region.
- [ ] **Step 3:** tests PASS.

---

### Task 7: Dataset `stream.json` + `lab.json`

**Files:** Create `content/mongodb/lab.json`, `content/mongodb/datasets/stream.json`, `scripts/streamDataset.test.ts`.

- [ ] **Step 1: failing test** — `scripts/streamDataset.test.ts` loads the file through `MongoSimEngine` and asserts every fact in spec §5: counts 20/12/25/36; ids ranges; `ratings.critics` missing on exactly 2 films; films in exactly 2000 and 2010 exist; ≥3 films under 100 min; ≥2 films with both Action and Adventure; an actor in exactly 3 films; a director with exactly 3 films; ≥3 films with no reviews; review comments containing "twist" and "slow" in mixed case; user 101 has incomplete views over 120 min; one user without `preferences`; every `reviews.movie_id`/`user_id` and `watch_history` reference exists; `_meta.descriptions` covers all four collections; **no real film titles** (spot list: assert none of `["Inception","Titanic","Avatar","The Matrix","Interstellar"]`).
- [ ] **Step 2: write `lab.json`** exactly per spec §6 (18 keys incl. the 15 chapter titles in order and the three levels).
- [ ] **Step 3: write `stream.json`** — fictional films/people (a friendly international mix of names), invented scores, ISO date strings in 2025–2026, plus `_meta.descriptions`. Make the per-lesson facts in the tables below true.
- [ ] **Step 4:** test PASS; `npm run check-content` shows `mongodb: 0 item(s) checked, 0 problem(s)`.

---

### Tasks 8–11: Lessons and problems

**Writing rules (every file):** front-matter (`id`, `title`, `chapter` = exact `lab.json` title, `order`, `dataset: stream` *or* a `## Setup` block **placed last**, `check`, `checkQuery` for `state`/`custom`) → **explanation (non-empty, before the first `##`)** → `## Watch it happen` (✦ only; YAML `tables` + 3–5 `steps` built from **real** rows) → `## Context` (one more idea + a runnable ```js example on different data/question, returning ≥1 document) → `## Task` (what to return: fields, order; never the exact expression) → `## Hint` (bullets that point the way, never the full clause) → `## Solution` (one ```js block). Reads: `rows-unordered` (or `rows-ordered` when the task states an order). Writes: `check: state` with a `checkQuery` that reads the **whole affected collection sorted by `_id`** (e.g. `db.users.find({}, { name: 1, plan: 1 }).sort({ _id: 1 })`) so a no-op fails. Lessons whose task needs the dataset unchanged use `dataset: stream`; problems use their own `## Setup` (```json collections) and follow the SQL problem format (`## Tables` with a sample document, `## Task`, `## Example` with Input/Output/Explanation matching the setup and the real output, `## Hint`, `## Setup`, `## Solution`, `difficulty`). Original, fictional, no "Chai". Run every Context example once.

**Per task:** write the files → `npm run check-content` (mongodb counts: after Task 8 → 13, 9 → 27, 10 → 40, 11 → 52, 0 problems) → re-read every hint → snapshot (no commit).

#### Task 8: Beginner (13 lessons, ✦ 5 and 12)
| # | Dir / id | Title | Check | Task asks for |
|---|---|---|---|---|
| 1 | `01-meet-documents/01-first-find` | Your first find | rows-unordered | every user |
| 2 | `01-meet-documents/02-exact-match` | Matching an exact value | rows-unordered | users on the `premium` plan |
| 3 | `02-projections-and-limits/01-projection` | Choosing fields with a projection | rows-unordered | each film's title and year, without `_id` |
| 4 | `02-projections-and-limits/02-limit-skip` | Limiting and skipping | rows-ordered | films 4–6 when sorted by `_id` |
| 5 ✦ | `02-projections-and-limits/03-sort` | Sorting results | rows-ordered | titles and audience scores, highest first (no ties in data) |
| 6 | `03-comparison-operators/01-gt-lt` | Greater and less than | rows-unordered | films longer than 150 minutes |
| 7 | `03-comparison-operators/02-ranges` | Ranges with $gte and $lte | rows-unordered | films released 2000–2009 inclusive |
| 8 | `03-comparison-operators/03-in-nin` | Lists with $in and $nin | rows-unordered | users whose plan is `free` or `basic` |
| 9 | `04-inserting-data/01-insert-one` | Inserting one document | state (`users` sorted by `_id`) | add a given user without an `_id` |
| 10 | `04-inserting-data/02-insert-many` | Inserting many documents | state (`watch_history` sorted) | add two given watch events |
| 11 | `04-inserting-data/03-custom-id` | Choosing your own _id | state (`users` sorted) | add a user with the string `_id` given |
| 12 ✦ | `05-updating-and-deleting/01-set-unset` | Changing fields with $set and $unset | state (`users` sorted) | upgrade one user to premium and remove their `preferences.max_rating` |
| 13 | `05-updating-and-deleting/02-delete` | Deleting documents | state (`reviews` sorted) | delete reviews with rating below 3 |

#### Task 9: Intermediate (14 lessons, ✦ 14, 17, 22, 24)
| # | Dir / id | Title | Check | Task asks for |
|---|---|---|---|---|
| 14 ✦ | `06-complex-queries/01-or-and` | Combining conditions with $or and $and | rows-unordered | films that are Comedy **or** shorter than 95 min, released after 2005 |
| 15 | `06-complex-queries/02-exists` | Checking a field exists | rows-unordered | films with no critics score |
| 16 | `06-complex-queries/03-regex` | Matching text with $regex | rows-unordered | reviews whose comment mentions "twist" in any case |
| 17 ✦ | `07-embedded-documents/01-dot-notation` | Dot notation | rows-unordered | films whose director is the given person |
| 18 | `07-embedded-documents/02-match-subdocument` | Matching a whole sub-document | rows-unordered | films whose `details` equals a given whole object (and the explanation shows why field order matters there) |
| 19 | `07-embedded-documents/03-update-nested` | Updating nested fields | state (`movies` sorted) | set one film's `details.language` |
| 20 | `08-array-queries/01-array-value` | Matching an array value | rows-unordered | films tagged Thriller |
| 21 | `08-array-queries/02-all` | Requiring several values with $all | rows-unordered | films with both Action and Adventure |
| 22 ✦ | `08-array-queries/03-elem-match` | Matching array objects with $elemMatch | rows-unordered | films where the given actor plays a role containing "Detective" |
| 23 | `09-array-updates/01-push-addtoset` | Adding with $push and $addToSet | state (`users` sorted) | add a genre to one user's favourites without duplicates |
| 24 ✦ | `09-array-updates/02-pull` | Removing with $pull | state (`movies` sorted) | remove a tag from every film |
| 25 | `09-array-updates/03-positional` | The positional $ operator | state (`movies` sorted) | rename one cast member's role in one film |
| 26 | `10-counting-and-distinct/01-count` | Counting documents | rows-unordered | how many films are longer than 2 hours |
| 27 | `10-counting-and-distinct/02-distinct` | Distinct values | rows-unordered | every director's name |

#### Task 10: Advanced (13 lessons, ✦ 28, 29, 31, 34)
| # | Dir / id | Title | Check | Task asks for |
|---|---|---|---|---|
| 28 ✦ | `11-aggregation-pipeline/01-match-project` | $match and $project | rows-unordered | title and a computed `hours` for films after 2015 |
| 29 ✦ | `11-aggregation-pipeline/02-group` | Grouping with $group | rows-unordered | per plan: number of users |
| 30 | `11-aggregation-pipeline/03-sort-limit` | Sorting and limiting in a pipeline | rows-ordered | top 3 directors by average audience score |
| 31 ✦ | `12-reshaping-arrays/01-unwind` | Unwinding arrays | rows-unordered | each genre with its number of films |
| 32 | `12-reshaping-arrays/02-addtoset` | Collecting with $addToSet | rows-unordered | per user: the set of film ids they watched |
| 33 | `12-reshaping-arrays/03-filter-size` | $filter and $size | rows-unordered | per film: how many cast members play a lead (`role` contains "Lead") |
| 34 ✦ | `13-multi-collection-lookups/01-lookup` | Joining with $lookup | rows-unordered | each film with its number of reviews (including 0) |
| 35 | `13-multi-collection-lookups/02-lookup-unwind` | Flattening joined arrays | rows-unordered | each review with its film's title |
| 36 | `13-multi-collection-lookups/03-lookup-pipeline` | Lookups with a pipeline | rows-unordered | each user with only their reviews rated 8 or more |
| 37 | `14-conditional-expressions/01-cond-switch` | $cond and $switch | rows-unordered | each film's title and a `length` label (short/feature/epic) |
| 38 | `14-conditional-expressions/02-bucket` | Grouping into ranges with $bucket | rows-ordered | films per decade 1990–2030 (boundaries include 2000 and 2010 exactly; explanation states `[lower, upper)`) |
| 39 | `15-reshaping-documents/01-addfields-replaceroot` | $addFields and $replaceRoot | rows-unordered | each film's `details` promoted to the top level with the title added |
| 40 | `15-reshaping-documents/02-facet` | Several summaries at once with $facet | rows-unordered | one document with `byPlan` counts and `total` user count |

#### Task 11: Problems (12)
| Group dir | # / id | Title | Difficulty | Skill |
|---|---|---|---|---|
| `01-warm-up` | 01 `top-rated-sci-fi` | Top-Rated Sci-Fi | Easy | filter + sort + limit (rows-ordered) |
| `01-warm-up` | 02 `short-features` | Short Features | Easy | comparison + projection |
| `01-warm-up` | 03 `directors-films` | A Director's Films | Easy | dot notation |
| `01-warm-up` | 04 `premium-count` | Premium Subscriber Count | Easy | `countDocuments` |
| `02-everyday-mongodb` | 01 `crowd-and-critics` | Critics' and Audience Favourites | Medium | two nested thresholds |
| `02-everyday-mongodb` | 02 `action-adventure` | Action-Adventure Picks | Medium | `$all` |
| `02-everyday-mongodb` | 03 `find-cast-member` | Find a Cast Member | Medium | `$elemMatch` |
| `02-everyday-mongodb` | 04 `mark-long-views` | Mark Long Views Complete | Medium | `updateMany` (state) |
| `03-aggregation-and-power` | 01 `genre-scorecard` | Genre Scorecard | Hard | `$unwind` + `$group` (avg, count) |
| `03-aggregation-and-power` | 02 `reviewer-summary` | Reviewer Summary | Hard | `$lookup` + `$group` |
| `03-aggregation-and-power` | 03 `films-per-decade` | Films per Decade | Hard | computed decade + `$group` (or `$bucket`) |
| `03-aggregation-and-power` | 04 `binge-leaderboard` | Binge-Watch Leaderboard | Hard | `$group` + `$sort` + `$limit` (rows-ordered) |

---

### Task 12: Shape, checks and content tests

**Files:** Create `scripts/mongoLabShape.test.ts`, `scripts/mongoChecks.test.ts`.

- [ ] **`mongoLabShape.test.ts`** (same pattern as `scripts/postgresLabShape.test.ts`): no content errors; 15 chapters with counts `2,3,3,3,2 · 3,3,3,3,2 · 3,3,3,2,2`; 40 lessons; first lesson "Your first find"; animated positions exactly `[5, 12, 14, 17, 22, 24, 28, 29, 31, 34]`; every lesson has a non-empty `body` and a `context`; levels as in spec; 12 problems 4/4/4 Easy/Medium/Hard in the three groups, each with `setup`, `tables`, `example`, no `dataset`.
- [ ] **`mongoChecks.test.ts`** (same pattern as `scripts/postgresChecks.test.ts`, engine `MongoSimEngine`): (a) every `state`/`custom` lesson fails `db.movies.find({}).limit(0)` and `db.users.countDocuments()`; (b) reordered answers pass: the projection lesson with fields swapped, the group lesson with accumulators swapped, the set-unset lesson with `$unset` before `$set`; (c) the insert-one lesson passes whether or not the learner writes the same field order as the solution.
- [ ] Run both → PASS.

---

### Task 13: Home page, registry tests, e2e

**Files:** Modify `apps/web/src/home/homeContent.ts` (`LIVE_DESCRIPTIONS.mongodb`: "From your first document to aggregation pipelines and joins, all on a streaming-service database."; make `STEPS[1]` and `FEATURES[0]` database-neutral, e.g. "Write a query in the editor and press Run. The database runs inside your browser and returns real results." / "Every database runs inside the page itself. No install, no account, and your queries never leave your machine."), `apps/web/src/content/registry.test.ts` (live: sql, postgres, mongodb; `upcomingLabs()` → `['Redis']`), `apps/web/src/home/HomePage.test.tsx` and `homeContent.test.ts` (three live labs; headline "Three labs are open. One more is cooking."; pill computed), `e2e/lab.spec.ts` (region name now "Three labs are open. One more is cooking."; MongoDB-not-a-link assertion becomes Redis-not-a-link).
- [ ] Append a `test.describe('mongodb lab', …)` block:
  1. `/mongodb` → "Your first find" → Solution → Load into editor → Run → "Correct!"; the editor title reads "MongoDB shell".
  2. Skip banner ("Already know the MongoDB basics?") → lands on the first Complex Queries lesson without a reload (window marker survives).
  3. Results toggle: run the first lesson's solution, switch to Documents, see a JSON document, switch back to Table.
  4. Schema panel: open Database Schema, "View sample data" on `movies` shows 3 documents.
  5. The `$lookup` lesson solves end to end.
  6. Home: MongoDB card links to `/mongodb`; exactly one "Coming soon" (Redis); `/` still makes no `lab-content/` request.
- [ ] `npx playwright test -g "mongodb lab"` → PASS, then `npm run e2e` → all pass (34 existing, some updated on purpose, + 6 new = 40).

---

### Task 14: README, bundle check, full verification
- [ ] README: add the MongoDB lab (counts), the `@codeadda/engine-mongo-sim` package, the supported mongosh subset (one short list) and the dataset JSON format.
- [ ] `npm run build -w @codeadda/web`: entry `index-*.js` must stay ≤ the current 291.47 kB (+ ≤ 5 kB tolerance for labels); a separate `mongo.worker-*.js` and a `mongodb-*.js` content chunk exist; `ts.worker-*.js` exists but is not loaded on `/` or in SQL labs; `grep -rl jsdelivr apps/web/dist` finds nothing.
- [ ] `npm run typecheck && npm test && npm run check-content && npm run e2e` → clean; content `sql 70`, `postgres 58`, `mongodb 52`, 0 problems.
- [ ] Ledger summary: final numbers, bundle sizes, rulings, deferred items.

## Self-review notes
- Spec coverage: §2 decisions → Tasks 1–5; §3 engine → Tasks 2–3; §4 web → Tasks 4–6, 13; §5 dataset → Task 7; §6 outline → Tasks 8–11; §7 rules → Tasks 8–11 header; §8 verification → Tasks 12–14.
- Verified before writing: mingo 7.2.4 is latest; `find`/projection/sort, `$elemMatch`, `$all`, `$regex`, `$lookup` (simple + pipeline), `$unwind`/`$group`, `$cond`/`$switch`, `$filter`/`$size`, all update operators incl. positional `$` work; `$bucket` is wrong at boundaries (hence Task 3); `$jsonSchema` needs a validator (hence chapter 15 change); Monaco 0.57 has `language/typescript/ts.worker` and `javascriptDefaults`.
- Types: `MongoCall` (T2) → engine (T3) → workers (T4); `labUi` (T5) used in T5–T6, T13.
