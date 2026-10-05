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
