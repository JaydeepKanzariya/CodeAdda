type Stage = Record<string, unknown>;

/**
 * mingo 7.2.4 ignores localField/foreignField when a $lookup also has a pipeline (the MongoDB 5.0+ concise form)
 * and joins every document that has any match. Rewrite it to the let + $expr form, which mingo handles correctly.
 */
export function rewriteLookups(pipeline: unknown[]): unknown[] {
  return pipeline.map((s) => {
    const stage = s as Stage;
    if (stage.$facet && typeof stage.$facet === 'object') {
      return { $facet: Object.fromEntries(Object.entries(stage.$facet as Record<string, unknown[]>).map(([k, p]) => [k, rewriteLookups(p)])) };
    }
    const lookup = stage.$lookup as Stage | undefined;
    if (!lookup || !Array.isArray(lookup.pipeline)) return stage;
    const { localField, foreignField, pipeline: inner, let: vars, ...rest } = lookup;
    if (typeof localField !== 'string' || typeof foreignField !== 'string') return { $lookup: { ...lookup, pipeline: rewriteLookups(inner as unknown[]) } };
    // MongoDB matches when the local value equals the foreign one, or (for an array) contains it.
    const local = '$$codeadda_local';
    const join = { $match: { $expr: { $in: [`$${foreignField}`, { $cond: [{ $isArray: local }, local, [local]] }] } } };
    return { $lookup: { ...rest, let: { ...((vars as Stage | undefined) ?? {}), codeadda_local: `$${localField}` }, pipeline: [join, ...rewriteLookups(inner as unknown[])] } };
  });
}
