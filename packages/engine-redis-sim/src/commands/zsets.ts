import { RedisError } from "../types";
import {
  byteCompare,
  formatFloat,
  parseFloatArg,
  parseScoreBound,
} from "../util";
export interface FamilyContext {
  db: import("../keyspace").Keyspace;
  nextStreamId?: () => string;
}
const wrong =
  "WRONGTYPE Operation against a key holding the wrong kind of value";
const status = (v: string): import("../types").Reply => ({ t: "status", v });
const int = (v: number): import("../types").Reply => ({ t: "int", v });
const bulk = (v: string | null): import("../types").Reply => ({ t: "bulk", v });
const arr = (
  v: import("../types").Reply[] | null,
): import("../types").Reply => ({ t: "array", v });
export function executeZsets(
  ctx: FamilyContext,
  c: import("../tokenize").Command,
): {
  reply: import("../types").Reply;
  shape: import("../types").Shape;
  notice?: string;
} {
  const a = c.args,
    n = a[0]!.toUpperCase(),
    k = a[1],
    e = () => ctx.db.get(k!);

  const key = k!,
    existing = ctx.db.get(key);
  if (existing && existing.type !== "zset") throw new RedisError(wrong);
  const scores = existing?.value as Map<string, number> | undefined;
  const z = scores ?? new Map<string, number>();
  const ordered = () =>
    [...z].sort(
      (left, right) => left[1] - right[1] || byteCompare(left[0], right[0]),
    );
  if (n === "ZADD") {
    let index = 2,
      nx = false,
      xx = false,
      gt = false,
      lt = false,
      ch = false,
      changed = 0,
      incr = false;
    while (
      index < a.length &&
      ["NX", "XX", "GT", "LT", "CH", "INCR"].includes(a[index]!.toUpperCase())
    ) {
      const option = a[index]!.toUpperCase();
      nx ||= option === "NX";
      xx ||= option === "XX";
      gt ||= option === "GT";
      lt ||= option === "LT";
      ch ||= option === "CH";
      incr ||= option === "INCR";
      index++;
    }
    for (; index < a.length; index += 2) {
      const score = parseFloatArg(a[index]!);
      const member = a[index + 1]!;
      const old = z.get(member);
      if ((nx && old !== undefined) || (xx && old === undefined)) continue;
      if (
        (old !== undefined && gt && score <= old) ||
        (old !== undefined && lt && score >= old)
      )
        continue;
      const next = old === undefined ? score : incr ? old + score : score;
      if (old === undefined) changed++;
      else if (next !== old && ch) changed++;
      z.set(member, next);
    }
    if (z.size > 0 && !existing) ctx.db.set(key, { type: "zset", value: z });
    return {
      reply: incr ? bulk(formatFloat(z.get(a[index - 1]!)!)) : int(changed),
      shape: "scalar",
    };
  }
  if (n === "ZREMRANGEBYSCORE") {
    const reverse = a.some((value) => value.toUpperCase() === "REV");
    const low = parseScoreBound(reverse ? a[3]! : a[2]!),
      high = parseScoreBound(reverse ? a[2]! : a[3]!);
    let removed = 0;
    for (const [member, score] of z)
      if (
        (low.exclusive ? score > low.value : score >= low.value) &&
        (high.exclusive ? score < high.value : score <= high.value)
      ) {
        z.delete(member);
        removed++;
      }
    if (removed === 0) return { reply: int(0), shape: "scalar" };
    if (z.size === 0) ctx.db.del(key);
    return { reply: int(removed), shape: "scalar" };
  }
  if (n === "ZREMRANGEBYRANK") {
    let start = Number(a[2]), stop = Number(a[3]);
    const values = ordered();
    if (start < 0) start = values.length + start;
    if (stop < 0) stop = values.length + stop;
    const removed = values.slice(Math.max(0, start), stop + 1);
    for (const [member] of removed) z.delete(member);
    if (z.size === 0) ctx.db.del(key);
    return { reply: int(removed.length), shape: "scalar" };
  }
  if (n === "ZUNIONSTORE" || n === "ZINTERSTORE") {
    const count = Number(a[2]),
      names = a.slice(3, 3 + count),
      weights = new Array(count).fill(1) as number[];
    const wi = a.findIndex((value) => value.toUpperCase() === "WEIGHTS");
    if (wi >= 0)
      for (let i = 0; i < count; i++) weights[i] = Number(a[wi + 1 + i]);
    const aggregateIndex = a.findIndex(
      (value) => value.toUpperCase() === "AGGREGATE",
    );
    const aggregate = (
      aggregateIndex >= 0 ? a[aggregateIndex + 1] : "SUM"
    )!.toUpperCase();
    const result = new Map<string, number>();
    for (let i = 0; i < names.length; i++) {
      const input = ctx.db.get(names[i]!, "zset")?.value as
        Map<string, number> | undefined;
      if (!input) continue;
      for (const [member, score] of input) {
        const weighted = score * weights[i]!;
        if (!result.has(member)) result.set(member, weighted);
        else
          result.set(
            member,
            aggregate === "MAX"
              ? Math.max(result.get(member)!, weighted)
              : aggregate === "MIN"
                ? Math.min(result.get(member)!, weighted)
                : result.get(member)! + weighted,
          );
      }
    }
    if (n === "ZINTERSTORE")
      for (const member of [...result.keys()])
        if (
          !names.every(
            (name) =>
              ctx.db.get(name, "zset")?.value instanceof Map &&
              (ctx.db.get(name, "zset")!.value as Map<string, number>).has(
                member,
              ),
          )
        )
          result.delete(member);
    ctx.db.set(key, { type: "zset", value: result });
    return { reply: int(result.size), shape: "scalar" };
  }
  if (n === "ZREM") {
    let removed = 0;
    for (const member of a.slice(2)) if (z.delete(member)) removed++;
    if (z.size === 0) ctx.db.del(key);
    return { reply: int(removed), shape: "scalar" };
  }
  if (n === "ZSCORE")
    return {
      reply: bulk(z.has(a[2]!) ? formatFloat(z.get(a[2]!)!) : null),
      shape: "scalar",
    };
  if (n === "ZMSCORE")
    return {
      reply: arr(
        a
          .slice(2)
          .map((member) =>
            bulk(z.has(member) ? formatFloat(z.get(member)!) : null),
          ),
      ),
      shape: "values",
    };
  if (n === "ZCARD") return { reply: int(z.size), shape: "scalar" };
  if (n === "ZCOUNT") {
    const low = parseScoreBound(a[2]!);
    const high = parseScoreBound(a[3]!);
    let count = 0;
    for (const score of z.values()) {
      if (
        (low.exclusive ? score > low.value : score >= low.value) &&
        (high.exclusive ? score < high.value : score <= high.value)
      )
        count++;
    }
    return { reply: int(count), shape: "scalar" };
  }
  if (n === "ZINCRBY") {
    const value = (z.get(a[3]!) ?? 0) + parseFloatArg(a[2]!);
    z.set(a[3]!, value);
    if (!existing) ctx.db.set(key, { type: "zset", value: z });
    return { reply: bulk(formatFloat(value)), shape: "scalar" };
  }
  if (n === "ZPOPMIN" || n === "ZPOPMAX") {
    const values = ordered();
    if (n === "ZPOPMAX") values.reverse();
    const count = Number(a[2] ?? 1);
    const removed = values.slice(0, count);
    for (const [member] of removed) z.delete(member);
    if (z.size === 0) ctx.db.del(key);
    return {
      reply: arr(
        removed.flatMap(([member, score]) => [
          bulk(member),
          bulk(formatFloat(score)),
        ]),
      ),
      shape: "scored",
    };
  }
  if (n === "ZRANGE" || n === "ZREVRANGE" || n === "ZRANGEBYSCORE") {
    const byScore =
      n === "ZRANGEBYSCORE" ||
      a.some((value) => value.toUpperCase() === "BYSCORE");
    let values = ordered();
    const reverse =
      n === "ZREVRANGE" || a.some((value) => value.toUpperCase() === "REV");
    if (reverse) values = values.reverse();
    if (byScore) {
      const low = parseScoreBound(reverse ? a[3]! : a[2]!),
        high = parseScoreBound(reverse ? a[2]! : a[3]!);
      values = values.filter((entry) => {
        const score = entry[1];
        return (
          (low.exclusive ? score > low.value : score >= low.value) &&
          (high.exclusive ? score < high.value : score <= high.value)
        );
      });
    } else {
      let start = Number(a[2]),
        stop = Number(a[3]);
      if (start < 0) start = values.length + start;
      if (stop < 0) stop = values.length + stop;
      values = values.slice(Math.max(start, 0), stop + 1);
    }
    const limit = a.findIndex((value) => value.toUpperCase() === "LIMIT");
    if (limit >= 0)
      values = values.slice(
        Number(a[limit + 1]),
        Number(a[limit + 1]) + Number(a[limit + 2]),
      );
    const withScores = a.some((value) => value.toUpperCase() === "WITHSCORES");
    return {
      reply: arr(
        values.flatMap((entry) =>
          withScores
            ? [bulk(entry[0]), bulk(formatFloat(entry[1]))]
            : [bulk(entry[0])],
        ),
      ),
      shape: withScores ? "scored" : "values",
    };
  }
  if (n === "ZRANK" || n === "ZREVRANK") {
    const q = ordered();
    const i = q.findIndex((entry) => entry[0] === a[2]);
    if (i < 0) return { reply: bulk(null), shape: "scalar" };
    return { reply: int(n === "ZRANK" ? i : q.length - 1 - i), shape: "scalar" };
  }
  throw new RedisError(`ERR unknown sorted-set command '${n}'`);
}
