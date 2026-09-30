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
  private queue: Promise<void> = Promise.resolve();

  private getDb(): Promise<PGlite> {
    if (!this.db) {
      const created = PGlite.create({ parsers: PARSERS });
      this.db = created;
      // Do not cache a failed start: the next call (e.g. Retry) tries again.
      created.catch(() => {
        if (this.db === created) this.db = undefined;
      });
    }
    return this.db;
  }

  setup(dataset: Dataset): Promise<void> {
    this.dataset = dataset;
    return this.serialise(() => this.rebuild(dataset));
  }

  reset(): Promise<void> {
    // Capture the dataset now: a setup() queued after this call must not change what it loads.
    const dataset = this.dataset;
    return this.serialise(() => this.rebuild(dataset));
  }

  /** Runs setup/reset one at a time, in call order, so their statements never interleave. */
  private serialise(task: () => Promise<void>): Promise<void> {
    const next = this.queue.then(task);
    // A failed step must not block the ones queued after it.
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async rebuild(dataset: Dataset | undefined): Promise<void> {
    const db = await this.getDb();
    try {
      await db.exec('ROLLBACK');
    } catch {
      // no open transaction
    }
    // Undo session state the learner may have changed: settings (search_path, DateStyle, ...),
    // temp tables that could shadow lesson tables, prepared statements, advisory locks.
    // PGlite sets search_path=public per session at start-up; DISCARD ALL would revert it to the
    // single-user boot value (pg_catalog), so restore PGlite's value explicitly.
    await db.exec('DISCARD ALL'); // must run on its own, outside a (implicit) transaction block
    await db.exec('SET search_path TO public');
    const { rows } = await db.query<{ nspname: string }>(
      `SELECT nspname FROM pg_namespace
        WHERE nspname NOT LIKE 'pg\\_%' AND nspname <> 'information_schema'`,
    );
    const drops = rows.map((r) => `DROP SCHEMA IF EXISTS ${quoteIdent(r.nspname)} CASCADE;`).join(' ');
    await db.exec(`${drops} CREATE SCHEMA public;`);
    if (dataset?.source.trim()) await db.exec(dataset.source);
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
    const pending = this.db;
    this.db = undefined;
    const db = await pending.catch(() => undefined);
    await db?.close();
  }
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
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
