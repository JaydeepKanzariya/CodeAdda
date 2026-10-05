import { aggregate } from 'mingo';
import { describe, expect, it } from 'vitest';
import { assertNoOutsideBucket, rewriteBuckets } from './bucket';

const docs = [1990, 1995, 2000, 2004, 2010, 2015, 2030].map((y, i) => ({ _id: i, y }));
const run = (stage: Record<string, unknown>) => {
  const result = aggregate(docs, rewriteBuckets([stage]) as Array<Record<string, unknown>>);
  assertNoOutsideBucket(result as unknown[]);
  return result;
};

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
