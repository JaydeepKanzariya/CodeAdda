import { aggregate, find, Query } from 'mingo';
import { updateMany, updateOne } from 'mingo/updater';
import type { ColumnInfo, Dataset, Engine, QueryResult, SchemaInfo, TableInfo } from '@codeadda/core';
import { assertNoOutsideBucket, rewriteBuckets } from './bucket';
import { rewriteLookups } from './lookup';
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
      return {
        ok: true,
        columns,
        rows: docs.map((d) => columns.map((c) => (c in d ? d[c] : null))),
        rowCount: docs.length,
        durationMs: Math.round(performance.now() - t0),
        documents: docs,
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
        const out = aggregate(c, rewriteBuckets(rewriteLookups(a0)) as Doc[], { collectionResolver: (n: string) => this.coll(n) }) as Doc[];
        assertNoOutsideBucket(out);
        return structuredClone(out);
      }
      case 'countDocuments': return [{ count: find(c, a0 ?? {}).all().length }];
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
        const arrayFilters = (a2 as { arrayFilters?: Doc[] } | undefined)?.arrayFilters;
        const r = fn(c, a0 ?? {}, a1 as Doc, arrayFilters ? { arrayFilters } : undefined) as { matchedCount: number; modifiedCount: number };
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

// mingo walks field paths with plain property access, so "constructor.prototype.x" would reach Object.prototype.
const RESERVED = new Set(['__proto__', 'constructor', 'prototype']);
const usesReserved = (path: string) => path.replace(/^\$+/, '').split('.').some((s) => RESERVED.has(s));
const reservedError = (path: string) => new Error(`"${path}" uses a reserved name (__proto__, constructor or prototype) and is not allowed in this lab.`);

function assertAllowed(call: MongoCall): void {
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (typeof v === 'string' && v.startsWith('$') && usesReserved(v)) throw reservedError(v);
    if (v && typeof v === 'object' && !(v instanceof RegExp)) {
      for (const [k, x] of Object.entries(v)) {
        if (Object.hasOwn(BLOCKED, k)) throw new Error(BLOCKED[k]);
        if (usesReserved(k)) throw reservedError(k);
        walk(x);
      }
    }
  };
  walk(call.args);
}

function checkUpdate(update: unknown, options: unknown): void {
  if (Array.isArray(update)) throw new Error('Pipeline-style updates are not supported in this lab; use operators such as $set.');
  if (!update || typeof update !== 'object' || Object.keys(update).length === 0 || !Object.keys(update).every((k) => k.startsWith('$'))) throw new Error('Use replaceOne to replace a whole document, or an update operator such as $set.');
  if (options && typeof options === 'object' && (options as Doc).upsert) throw new Error('upsert is not supported in this lab.');
  const unknown = options && typeof options === 'object' ? Object.keys(options).filter((k) => k !== 'arrayFilters' && k !== 'upsert') : [];
  if (unknown.length) throw new Error(`Update option ${unknown.join(', ')} is not supported in this lab; only arrayFilters is.`);
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
