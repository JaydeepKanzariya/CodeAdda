import {
  NOW_MS,
  RedisError,
  type Reply,
  type Shape,
  type StreamValue,
  type StringValue,
} from "../types";
import type { Command } from "../tokenize";
import { Keyspace } from "../keyspace";
import { executeZsets } from "./zsets";
import { executeStreams } from "./streams";
import {
  addInteger,
  byteCompare,
  formatFloat,
  parseFloatArg,
  parseInteger,
  parseScoreBound,
} from "../util";

export interface CollectionsContext {
  db: Keyspace;
  nextStreamId(): string;
  config: { maxmemory: string; "maxmemory-policy": string };
  bitmap(command: Command): { reply: Reply; shape: Shape };
  hll(command: Command): { reply: Reply; shape: Shape };
}
const status = (v: string): Reply => ({ t: "status", v });
const int = (v: number): Reply => ({ t: "int", v });
const bulk = (v: string | null): Reply => ({ t: "bulk", v });
const arr = (v: Reply[] | null): Reply => ({ t: "array", v });
const ZSET_COMMANDS = [
  "ZADD",
  "ZREM",
  "ZSCORE",
  "ZMSCORE",
  "ZINCRBY",
  "ZCARD",
  "ZCOUNT",
  "ZRANK",
  "ZREVRANK",
  "ZRANGE",
  "ZREVRANGE",
  "ZRANGEBYSCORE",
  "ZREMRANGEBYSCORE",
  "ZREMRANGEBYRANK",
  "ZPOPMIN",
  "ZPOPMAX",
  "ZUNIONSTORE",
  "ZINTERSTORE",
];
const STREAM_COMMANDS = [
  "XADD",
  "XLEN",
  "XRANGE",
  "XREVRANGE",
  "XDEL",
  "XTRIM",
  "XGROUP",
  "XREAD",
  "XREADGROUP",
  "XACK",
  "XPENDING",
];
const wrong =
  "WRONGTYPE Operation against a key holding the wrong kind of value";
const text = (entry: { value: StringValue }): string => {
  const value = entry.value;
  if (value.kind !== "text") throw new RedisError(wrong);
  return value.text;
};
export function executeCollections(
  ctx: CollectionsContext,
  c: Command,
): {
  reply: Reply;
  shape: Shape;
  notice?: string;
} {
  const a = c.args,
    n = a[0]!.toUpperCase(),
    k = a[1];
  const e = () => ctx.db.get(k!);
  if (
    [
      "HSET",
      "HMSET",
      "HSETNX",
      "HGET",
      "HMGET",
      "HGETALL",
      "HDEL",
      "HEXISTS",
      "HKEYS",
      "HVALS",
      "HLEN",
      "HINCRBY",
      "HINCRBYFLOAT",
    ].includes(n)
  ) {
    const x = e();
    if (x && x.type !== "hash") throw new RedisError(wrong);
    let m = x?.value as Map<string, string> | undefined;
    if (!m) {
      if (
        [
          "HGET",
          "HMGET",
          "HGETALL",
          "HDEL",
          "HEXISTS",
          "HKEYS",
          "HVALS",
          "HLEN",
        ].includes(n)
      )
        m = new Map();
      else {
        m = new Map();
        ctx.db.set(k!, { type: "hash", value: m });
      }
    }
    if (n === "HSET" || n === "HMSET") {
      let added = 0;
      for (let i = 2; i < a.length; i += 2) {
        if (!m.has(a[i]!)) added++;
        m.set(a[i]!, a[i + 1] ?? "");
      }
      ctx.db.touch(k!);
      return {
        reply: n === "HSET" ? int(added) : status("OK"),
        shape: "scalar",
      };
    }
    if (n === "HSETNX") {
      if (m.has(a[2]!)) return { reply: int(0), shape: "scalar" };
      m.set(a[2]!, a[3]!);
      ctx.db.touch(k!);
      return { reply: int(1), shape: "scalar" };
    }
    if (n === "HGET")
      return { reply: bulk(m.get(a[2]!) ?? null), shape: "scalar" };
    if (n === "HMGET")
      return {
        reply: arr(a.slice(2).map((f) => bulk(m.get(f) ?? null))),
        shape: "values",
      };
    if (n === "HGETALL") {
      const z = [...m.keys()].sort(byteCompare);
      return {
        reply: arr(z.flatMap((f) => [bulk(f), bulk(m!.get(f)!)])),
        shape: "pairs",
      };
    }
    if (n === "HDEL") {
      let z = 0;
      for (const f of a.slice(2)) if (m.delete(f)) z++;
      if (m.size === 0) ctx.db.del(k!);
      return { reply: int(z), shape: "scalar" };
    }
    if (n === "HEXISTS")
      return { reply: int(m.has(a[2]!) ? 1 : 0), shape: "scalar" };
    if (n === "HKEYS")
      return {
        reply: arr([...m.keys()].sort(byteCompare).map(bulk)),
        shape: "unordered",
      };
    if (n === "HVALS")
      return {
        reply: arr(
          [...m.keys()].sort(byteCompare).map((f) => bulk(m!.get(f)!)),
        ),
        shape: "hvals",
      };
    if (n === "HLEN") return { reply: int(m.size), shape: "scalar" };
    if (n === "HINCRBY") {
      const step = parseInteger(a[3]!);
      const current = m.get(a[2]!) ?? "0";
      if (!/^-?\d+$/.test(current)) throw new RedisError("ERR hash value is not an integer");
      const next = addInteger(parseInteger(current), step);
      m.set(a[2]!, String(next));
      return { reply: int(Number(next)), shape: "scalar" };
    }
    const nv = formatFloat(parseFloatArg(m.get(a[2]!) ?? "0") + parseFloatArg(a[3]!));
    m.set(a[2]!, nv);
    return { reply: bulk(nv), shape: "scalar" };
  }
  if (n === "LMOVE" || n === "RPOPLPUSH") {
    const source = k!,
      destination = a[2]!;
    const src = ctx.db.get(source, "list")?.value as string[] | undefined;
    if (!src?.length) return { reply: bulk(null), shape: "scalar" };
    const dst = ctx.db.get(destination, "list")?.value as string[] | undefined;
    const target = dst ?? [];
    const fromLeft =
      n === "LMOVE" && a[3]?.toUpperCase() === "LEFT";
    const toLeft =
      n === "RPOPLPUSH" || a[4]?.toUpperCase() === "LEFT";
    const value = fromLeft ? src.shift()! : src.pop()!;
    if (dst === undefined)
      ctx.db.set(destination, { type: "list", value: target });
    toLeft ? target.unshift(value) : target.push(value);
    if (src.length === 0) ctx.db.del(source);
    return { reply: bulk(value), shape: "scalar" };
  }
  if (
    [
      "LPUSH",
      "RPUSH",
      "LPOP",
      "RPOP",
      "LRANGE",
      "LLEN",
      "LINDEX",
      "LSET",
      "LREM",
      "LTRIM",
      "LINSERT",
      "LPOS",
      "LMOVE",
      "BLPOP",
      "BRPOP",
      "BLMOVE",
      "RPOPLPUSH",
    ].includes(n)
  ) {
    let x = e();
    if (x && x.type !== "list") throw new RedisError(wrong);
    let l = x?.value as string[] | undefined;
    if (!l) {
      l = [];
      if (
        ["LRANGE", "LLEN", "LINDEX", "LPOP", "RPOP", "BLPOP", "BRPOP"].includes(
          n,
        )
      )
        l = [];
      else ctx.db.set(k!, { type: "list", value: l });
    }
    if (n === "LPUSH" || n === "RPUSH") {
      const vals = a.slice(2);
      n === "LPUSH" ? l.unshift(...vals.reverse()) : l.push(...vals);
      return { reply: int(l.length), shape: "scalar" };
    }
    if (n === "LLEN") return { reply: int(l.length), shape: "scalar" };
    if (n === "LRANGE") {
      let s = Number(a[2]),
        z = Number(a[3]);
      if (s < 0) s = l.length + s;
      if (z < 0) z = l.length + z;
      return {
        reply: arr(l.slice(Math.max(0, s), z + 1).map(bulk)),
        shape: "values",
      };
    }
    if (n === "LINDEX") {
      let i = Number(a[2]);
      if (i < 0) i += l.length;
      return { reply: bulk(l[i] ?? null), shape: "scalar" };
    }
    if (n === "LPOP" || n === "RPOP") {
      const count = a[2] ? Number(a[2]) : 1;
      const out: string[] = [];
      for (let i = 0; i < count && l.length; i++)
        out.push(n === "LPOP" ? l.shift()! : l.pop()!);
      if (l.length === 0) ctx.db.del(k!);
      return {
        reply: a[2] ? arr(out.map(bulk)) : bulk(out[0] ?? null),
        shape: a[2] ? "values" : "scalar",
      };
    }
    if (n === "LTRIM") {
      let s = Number(a[2]),
        z = Number(a[3]);
      l.splice(0, s < 0 ? l.length + s : s);
      l.splice(z - s + 1);
      if (l.length === 0) ctx.db.del(k!);
      return { reply: status("OK"), shape: "scalar" };
    }
    if (n === "LREM") {
      let count = Number(a[2]),
        v = a[3],
        removed = 0;
      if (count < 0) {
        for (let i = l.length - 1; i >= 0 && removed < -count; i--)
          if (l[i] === v) {
            l.splice(i, 1);
            removed++;
          }
      } else {
        for (let i = 0; i < l.length && (count === 0 || removed < count); )
          if (l[i] === v) {
            l.splice(i, 1);
            removed++;
          } else i++;
      }
      if (l.length === 0) ctx.db.del(k!);
      return { reply: int(removed), shape: "scalar" };
    }
    if (n === "LINSERT") {
      const before = a[2]?.toUpperCase() === "BEFORE";
      const pivot = l.indexOf(a[3]!);
      if (pivot < 0) return { reply: int(-1), shape: "scalar" };
      l.splice(pivot + (before ? 0 : 1), 0, a[4]!);
      ctx.db.touch(k!);
      return { reply: int(l.length), shape: "scalar" };
    }
    if (n === "LPOS") {
      const rank = Number(a[a.findIndex((x) => x.toUpperCase() === "RANK") + 1] ?? 1);
      const indexes: number[] = [];
      for (let i = 0; i < l.length; i++) if (l[i] === a[2]) indexes.push(i);
      return { reply: bulk(indexes[Math.max(0, rank - 1)]?.toString() ?? null), shape: "scalar" };
    }
    if (n === "RPOPLPUSH") {
      const src = ctx.db.get(k!, "list")?.value as string[];
      const dst = (ctx.db.get(a[2]!, "list")?.value as string[]) ?? [];
      if (!src?.length) return { reply: bulk(null), shape: "scalar" };
      const v = src.pop()!;
      dst.unshift(v);
      if (!ctx.db.get(a[2]!)) ctx.db.set(a[2]!, { type: "list", value: dst });
      if (src.length === 0) ctx.db.del(k!);
      return { reply: bulk(v), shape: "scalar" };
    }
    if (n === "LSET") {
      const index = Number(a[2]);
      if (index < 0 || index >= l.length)
        throw new RedisError("ERR index out of range");
      l[index] = a[3]!;
      ctx.db.touch(k!);
      return { reply: status("OK"), shape: "scalar" };
    }
    if (n === "LINSERT") {
      const pivot = l.indexOf(a[3]!);
      if (pivot < 0) return { reply: int(-1), shape: "scalar" };
      l.splice(pivot + (a[2]?.toUpperCase() === "BEFORE" ? 0 : 1), 0, a[4]!);
      return { reply: int(l.length), shape: "scalar" };
    }
    if (n === "LPOS") {
      const index = l.indexOf(a[2]!);
      return { reply: bulk(index < 0 ? null : String(index)), shape: "scalar" };
    }
    if (n === "BLPOP" || n === "BRPOP") {
      if (!l.length)
        return {
          reply: arr(null),
          shape: "values",
          notice: "Blocking commands return immediately in this lab.",
        };
      const v = n === "BLPOP" ? l.shift()! : l.pop()!;
      return { reply: arr([bulk(k!), bulk(v)]), shape: "values" };
    }
    throw new RedisError("ERR list command form is not supported");
  }
  if (n === "LMOVE" || n === "RPOPLPUSH") {
    const source = k!,
      destination = n === "LMOVE" ? a[2]! : a[2]!;
    const src = ctx.db.get(source, "list")?.value as string[] | undefined;
    if (!src?.length) return { reply: bulk(null), shape: "scalar" };
    const dst = ctx.db.get(destination, "list")?.value as string[] | undefined;
    const target = dst ?? [];
    const left = n === "RPOPLPUSH" || a[3]?.toUpperCase() === "LEFT";
    const value = left ? src.shift()! : src.pop()!;
    if (dst === undefined)
      ctx.db.set(destination, { type: "list", value: target });
    left ? target.unshift(value) : target.push(value);
    if (src.length === 0) ctx.db.del(source);
    return { reply: bulk(value), shape: "scalar" };
  }
  if (n === "LSET") {
    const list = ctx.db.get(k!, "list")?.value as string[] | undefined;
    const index = Number(a[2]);
    if (!list || index >= list.length || index < -list.length)
      throw new RedisError("ERR index out of range");
    list[index < 0 ? list.length + index : index] = a[3]!;
    ctx.db.touch(k!);
    return { reply: status("OK"), shape: "scalar" };
  }
  if (n === "SINTERCARD") {
    const count = Number(a[1]);
    const names = a.slice(2, 2 + count);
    let values = new Set(
      (ctx.db.get(names[0] ?? "", "set")?.value as Set<string>) ?? [],
    );
    for (const name of names.slice(1)) {
      const current = ctx.db.get(name, "set")?.value as Set<string> | undefined;
      values = new Set([...values].filter((value) => current?.has(value)));
    }
    const limitIndex = a.findIndex((value) => value.toUpperCase() === "LIMIT");
    const limit = limitIndex >= 0 ? Number(a[limitIndex + 1]) : values.size;
    return { reply: int(Math.min(values.size, limit)), shape: "scalar" };
  }
  if (ZSET_COMMANDS.includes(n)) return executeZsets(ctx, c);
  if (
    [
      "LPUSH",
      "RPUSH",
      "LPOP",
      "RPOP",
      "LRANGE",
      "LLEN",
      "LINDEX",
      "LSET",
      "LREM",
      "LTRIM",
      "LINSERT",
      "LPOS",
      "LMOVE",
      "BLPOP",
      "BRPOP",
      "BLMOVE",
      "RPOPLPUSH",
    ].includes(n)
  ) {
    let x = e();
    if (x && x.type !== "list") throw new RedisError(wrong);
    let l = x?.value as string[] | undefined;
    if (!l) {
      l = [];
      if (
        ["LRANGE", "LLEN", "LINDEX", "LPOP", "RPOP", "BLPOP", "BRPOP"].includes(
          n,
        )
      )
        l = [];
      else ctx.db.set(k!, { type: "list", value: l });
    }
    if (n === "LPUSH" || n === "RPUSH") {
      const vals = a.slice(2);
      n === "LPUSH" ? l.unshift(...vals.reverse()) : l.push(...vals);
      return { reply: int(l.length), shape: "scalar" };
    }
    if (n === "LLEN") return { reply: int(l.length), shape: "scalar" };
    if (n === "LRANGE") {
      let s = Number(a[2]),
        z = Number(a[3]);
      if (s < 0) s = l.length + s;
      if (z < 0) z = l.length + z;
      return {
        reply: arr(l.slice(Math.max(0, s), z + 1).map(bulk)),
        shape: "values",
      };
    }
    if (n === "LINDEX") {
      let i = Number(a[2]);
      if (i < 0) i += l.length;
      return { reply: bulk(l[i] ?? null), shape: "scalar" };
    }
    if (n === "LPOP" || n === "RPOP") {
      const count = a[2] ? Number(a[2]) : 1;
      const out: string[] = [];
      for (let i = 0; i < count && l.length; i++)
        out.push(n === "LPOP" ? l.shift()! : l.pop()!);
      if (l.length === 0) ctx.db.del(k!);
      return {
        reply: a[2] ? arr(out.map(bulk)) : bulk(out[0] ?? null),
        shape: a[2] ? "values" : "scalar",
      };
    }
    if (n === "LTRIM") {
      let s = Number(a[2]),
        z = Number(a[3]);
      l.splice(0, s < 0 ? l.length + s : s);
      l.splice(z - s + 1);
      return { reply: status("OK"), shape: "scalar" };
    }
    if (n === "LREM") {
      let count = Number(a[2]),
        v = a[3],
        removed = 0;
      for (
        let i = 0;
        i < l.length && (count === 0 || removed < Math.abs(count));
      )
        if (l[i] === v && (count >= 0 || removed >= 0)) {
          l.splice(count < 0 ? l.length - 1 - i : i, 1);
          removed++;
        } else i++;
      return { reply: int(removed), shape: "scalar" };
    }
    if (n === "BLPOP" || n === "BRPOP") {
      if (!l.length)
        return {
          reply: arr(null),
          shape: "values",
          notice: "Blocking commands return immediately in this lab.",
        };
      const v = n === "BLPOP" ? l.shift()! : l.pop()!;
      return { reply: arr([bulk(k!), bulk(v)]), shape: "values" };
    }
    throw new RedisError("ERR list command form is not supported");
  }
  if (
    [
      "SADD",
      "SREM",
      "SMEMBERS",
      "SISMEMBER",
      "SMISMEMBER",
      "SCARD",
      "SINTER",
      "SUNION",
      "SDIFF",
      "SINTERSTORE",
      "SUNIONSTORE",
      "SDIFFSTORE",
      "SMOVE",
      "SPOP",
      "SRANDMEMBER",
    ].includes(n)
  ) {
    if (n.endsWith("STORE")) {
      // SINTERSTORE dst src...: the destination is overwritten, never read as a source.
      const sources = a.slice(2).map((z) => (ctx.db.get(z, "set")?.value as Set<string>) ?? new Set<string>());
      const out = combineSets(n.replace("STORE", ""), sources);
      if (out.size) ctx.db.set(k!, { type: "set", value: out });
      else ctx.db.del(k!);
      return { reply: int(out.size), shape: "scalar" };
    }
    let x = e();
    if (x && x.type !== "set") throw new RedisError(wrong);
    let s = x?.value as Set<string> | undefined;
    if (!s) {
      s = new Set();
      // Only SADD creates a set; reading or removing from a missing key must not create one.
      if (n === "SADD") ctx.db.set(k!, { type: "set", value: s });
    }
    if (n === "SADD") {
      let z = 0;
      for (const v of a.slice(2))
        if (!s.has(v)) {
          s.add(v);
          z++;
        }
      return { reply: int(z), shape: "scalar" };
    }
    if (n === "SREM") {
      let z = 0;
      for (const v of a.slice(2)) if (s.delete(v)) z++;
      if (s.size === 0) ctx.db.del(k!);
      return { reply: int(z), shape: "scalar" };
    }
    if (n === "SMOVE") {
      const destination = ctx.db.get(a[2]!, "set")?.value as Set<string> | undefined;
      if (!s.delete(a[3]!)) return { reply: int(0), shape: "scalar" };
      const target = destination ?? new Set<string>();
      target.add(a[3]!);
      if (destination === undefined)
        ctx.db.set(a[2]!, { type: "set", value: target });
      if (s.size === 0) ctx.db.del(k!);
      return { reply: int(1), shape: "scalar" };
    }
    if (n === "SMEMBERS")
      return {
        reply: arr([...s].sort(byteCompare).map(bulk)),
        shape: "unordered",
      };
    if (n === "SISMEMBER")
      return { reply: int(s.has(a[2]!) ? 1 : 0), shape: "scalar" };
    if (n === "SMISMEMBER")
      return {
        reply: arr(a.slice(2).map((v) => int(s.has(v) ? 1 : 0))),
        shape: "values",
      };
    if (n === "SCARD") return { reply: int(s.size), shape: "scalar" };
    if (n === "SPOP") {
      const vals = [...s].sort(byteCompare),
        count = a[2] ? Number(a[2]) : 1,
        out = vals.slice(0, count);
      out.forEach((v) => s.delete(v));
      if (s.size === 0) ctx.db.del(k!);
      return {
        reply: a[2] ? arr(out.map(bulk)) : bulk(out[0] ?? null),
        shape: a[2] ? "unordered" : "scalar",
      };
    }
    if (n === "SRANDMEMBER") {
      const out = [...s].sort(byteCompare).slice(0, Number(a[2] ?? 1));
      return {
        reply: a[2] ? arr(out.map(bulk)) : bulk(out[0] ?? null),
        shape: "unordered",
      };
    }
    const sets = a
      .slice(1)
      .map((z) => (ctx.db.get(z, "set")?.value as Set<string>) ?? new Set());
    const out = combineSets(n, sets);
    return {
      reply: arr([...out].sort(byteCompare).map(bulk)),
      shape: "unordered",
    };
  }
  if (
    [
      "ZADD",
      "ZREM",
      "ZSCORE",
      "ZMSCORE",
      "ZINCRBY",
      "ZCARD",
      "ZCOUNT",
      "ZRANK",
      "ZREVRANK",
      "ZRANGE",
      "ZREVRANGE",
      "ZRANGEBYSCORE",
      "ZREMRANGEBYSCORE",
      "ZREMRANGEBYRANK",
      "ZPOPMIN",
      "ZPOPMAX",
    ].includes(n)
  ) {
    let x = e();
    if (x && x.type !== "zset") throw new RedisError(wrong);
    let z = x?.value as Map<string, number> | undefined;
    if (!z) {
      z = new Map();
      if (
        [
          "ZSCORE",
          "ZMSCORE",
          "ZCARD",
          "ZCOUNT",
          "ZRANK",
          "ZREVRANK",
          "ZRANGE",
          "ZREVRANGE",
          "ZRANGEBYSCORE",
        ].includes(n)
      ) {
      } else ctx.db.set(k!, { type: "zset", value: z });
    }
    const ordered = () =>
      [...z].sort((a, b) => a[1] - b[1] || byteCompare(a[0], b[0]));
    if (n === "ZADD") {
      let added = 0;
      for (let i = 2; i < a.length; i += 2) {
        const sc = parseFloatArg(a[i]!),
          m = a[i + 1]!;
        if (!z.has(m)) added++;
        z.set(m, sc);
      }
      return { reply: int(added), shape: "scalar" };
    }
    if (n === "ZREM") {
      let q = 0;
      for (const m of a.slice(2)) if (z.delete(m)) q++;
      return { reply: int(q), shape: "scalar" };
    }
    if (n === "ZSCORE")
      return {
        reply: bulk(
          z.get(a[2]!) === undefined ? null : formatFloat(z.get(a[2]!)!),
        ),
        shape: "scalar",
      };
    if (n === "ZMSCORE")
      return {
        reply: arr(
          a
            .slice(2)
            .map((m) =>
              bulk(z.get(m) === undefined ? null : formatFloat(z.get(m)!)),
            ),
        ),
        shape: "values",
      };
    if (n === "ZCARD") return { reply: int(z.size), shape: "scalar" };
    if (n === "ZINCRBY") {
      const v = (z.get(a[3]!) ?? 0) + parseFloatArg(a[2]!);
      z.set(a[3]!, v);
      return { reply: bulk(formatFloat(v)), shape: "scalar" };
    }
    if (n === "ZRANK" || n === "ZREVRANK") {
      const q = ordered(),
        i = q.findIndex((x) => x[0] === a[2]);
      return {
        reply: int(i < 0 ? -1 : n === "ZRANK" ? i : q.length - 1 - i),
        shape: "scalar",
      };
    }
    if (n === "ZRANGE" || n === "ZREVRANGE" || n === "ZRANGEBYSCORE") {
      let q = ordered();
      if (n === "ZREVRANGE") q.reverse();
      let vals = q.slice(Number(a[2]), Number(a[3]) + 1);
      const ws = a.some((v) => v.toUpperCase() === "WITHSCORES");
      return {
        reply: arr(
          vals.flatMap((x) =>
            ws ? [bulk(x[0]), bulk(formatFloat(x[1]))] : [bulk(x[0])],
          ),
        ),
        shape: ws ? "scored" : "values",
      };
    }
    if (n === "ZCOUNT") {
      const lo = parseScoreBound(a[2]!),
        hi = parseScoreBound(a[3]!);
      return {
        reply: int(
          ordered().filter(
            (x) =>
              (lo.exclusive ? x[1] > lo.value : x[1] >= lo.value) &&
              (hi.exclusive ? x[1] < hi.value : x[1] <= hi.value),
          ).length,
        ),
        shape: "scalar",
      };
    }
    if (n === "ZPOPMIN" || n === "ZPOPMAX") {
      const q = ordered();
      if (n === "ZPOPMAX") q.reverse();
      const out = q.slice(0, Number(a[2] ?? 1));
      out.forEach((x) => z!.delete(x[0]));
      return {
        reply: arr(out.flatMap((x) => [bulk(x[0]), bulk(formatFloat(x[1]))])),
        shape: "scored",
      };
    }
    throw new RedisError("ERR sorted-set range form is not supported");
  }
  if (n === "SETBIT" || n === "GETBIT" || n === "BITCOUNT" || n === "BITOP") {
    return ctx.bitmap(c);
  }
  if (n === "PFADD" || n === "PFCOUNT" || n === "PFMERGE") {
    return ctx.hll(c);
  }
  if (STREAM_COMMANDS.includes(n)) return executeStreams(ctx, c);
  if (n === "CONFIG") {
    if (a[1]?.toUpperCase() === "GET") {
      const k = a[2]!;
      return {
        reply: arr([
          bulk(k),
          bulk(ctx.config[k as keyof typeof ctx.config] ?? null),
        ]),
        shape: "pairs",
      };
    }
    if (a[1]?.toUpperCase() === "SET") {
      if (!["maxmemory", "maxmemory-policy"].includes(a[2]!))
        throw new RedisError("CONFIG parameter is not supported in this lab");
      if (
        a[2] === "maxmemory-policy" &&
        ![
          "noeviction",
          "allkeys-lru",
          "allkeys-lfu",
          "allkeys-random",
          "volatile-lru",
          "volatile-lfu",
          "volatile-random",
          "volatile-ttl",
        ].includes(a[3]!)
      )
        throw new RedisError("ERR Invalid argument");
      ctx.config[a[2] as keyof typeof ctx.config] = a[3]!;
      return {
        reply: status("OK"),
        shape: "scalar",
        notice: "Stored only: this lab never evicts keys",
      };
    }
  }
  throw new RedisError(
    `ERR unknown command '${a[0]}', with args beginning with: ${a
      .slice(1, 3)
      .map((x) => `'${x}'`)
      .join(" ")}`,
  );
}

function combineSets(op: string, sets: Set<string>[]): Set<string> {
  if (op === "SUNION") return new Set(sets.flatMap((x) => [...x]));
  const out = new Set(sets[0]);
  if (op === "SDIFF") for (const q of sets.slice(1)) for (const v of q) out.delete(v);
  if (op === "SINTER") for (const v of [...out]) if (!sets.every((q) => q.has(v))) out.delete(v);
  return out;
}
