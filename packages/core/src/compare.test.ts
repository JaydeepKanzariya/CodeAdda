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
