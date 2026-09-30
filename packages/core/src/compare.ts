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
