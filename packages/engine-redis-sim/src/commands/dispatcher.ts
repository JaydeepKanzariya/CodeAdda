import {
  NOW_MS,
  RedisError,
  type Entry,
  type EntryValue,
  type Reply,
  type Shape,
  type StreamValue,
  type StringValue,
} from "../types";
import type { Command } from "../tokenize";
import { Keyspace } from "../keyspace";
import {
  addInteger,
  byteCompare,
  formatFloat,
  globToRegExp,
  parseFloatArg,
  parseInteger,
  parseScoreBound,
} from "../util";

export interface CommandContext {
  db: Keyspace;
  multi: boolean;
  queue: Command[];
  dirty: boolean;
  watches: Map<string, number>;
  arityError(name: string): string;
  execute(
    command: Command,
    snapshot?: boolean,
    setup?: boolean,
  ): { reply: Reply; shape: Shape; notice?: string };
  executeCollections(command: Command): {
    reply: Reply;
    shape: Shape;
    notice?: string;
  };
  config: { maxmemory: string; "maxmemory-policy": string };
}
const status = (v: string): Reply => ({ t: "status", v });
const int = (v: number): Reply => ({ t: "int", v });
const bulk = (v: string | null): Reply => ({ t: "bulk", v });
const arr = (v: Reply[] | null): Reply => ({ t: "array", v });
const wrong =
  "WRONGTYPE Operation against a key holding the wrong kind of value";
const err = (v: string): Reply => ({ t: "error", v });
const mktext = (text: string): Entry => ({
  type: "string" as const,
  value: { kind: "text" as const, text },
});
const text = (e: { value: EntryValue }): string => {
  const v = e.value as StringValue;
  if (v.kind !== "text") throw new RedisError(wrong);
  return v.text;
};
const arity = (args: string[], expected: number, name: string): void => {
  if (
    (expected > 0 && args.length !== expected) ||
    (expected < 0 && args.length < -expected)
  )
    throw new RedisError(
      `ERR wrong number of arguments for '${name.toLowerCase()}' command`,
    );
};
export function executeCommand(
  ctx: CommandContext,
  c: Command,
  snapshot = false,
  setup = false,
): { reply: Reply; shape: Shape; notice?: string } {
  const a = c.args,
    n = a[0]!.toUpperCase(),
    k = a[1];
  const get = (
    key = k,
    type?: "string" | "hash" | "list" | "set" | "zset" | "stream",
  ) => ctx.db.get(key!, type);
  if (
    [
      "SHUTDOWN",
      "DEBUG",
      "MONITOR",
      "SAVE",
      "BGSAVE",
      "BGREWRITEAOF",
      "REPLICAOF",
      "SLAVEOF",
      "CLIENT",
      "CLUSTER",
      "MIGRATE",
      "SELECT",
      "EVAL",
      "EVALSHA",
      "SCRIPT",
      "FUNCTION",
      "FCALL",
      "SUBSCRIBE",
      "PSUBSCRIBE",
      "PUBLISH",
    ].includes(n)
  )
    throw new RedisError(`${n} is not supported in the offline lab`);
  if (n === "MULTI") {
    if (ctx.multi) throw new RedisError("ERR MULTI calls can not be nested");
    ctx.multi = true;
    ctx.queue = [];
    ctx.dirty = false;
    return { reply: status("OK"), shape: "scalar" };
  }
  if (n === "DISCARD") {
    if (!ctx.multi) throw new RedisError("ERR DISCARD without MULTI");
    ctx.multi = false;
    ctx.queue = [];
    ctx.dirty = false;
    return { reply: status("OK"), shape: "scalar" };
  }
  if (n === "WATCH") {
    for (const x of a.slice(1)) {
      ctx.watches.set(x, ctx.db.versions.get(x) ?? 0);
    }
    return { reply: status("OK"), shape: "scalar" };
  }
  if (n === "UNWATCH") {
    ctx.watches.clear();
    return { reply: status("OK"), shape: "scalar" };
  }
  if (n === "EXEC") {
    if (!ctx.multi) throw new RedisError("ERR EXEC without MULTI");
    if (ctx.dirty) {
      ctx.multi = false;
      ctx.queue = [];
      throw new RedisError(
        "EXECABORT Transaction discarded because of previous errors.",
      );
    }
    for (const [x, v] of ctx.watches)
      if ((ctx.db.versions.get(x) ?? 0) !== v) {
        ctx.multi = false;
        ctx.queue = [];
        ctx.watches.clear();
        return { reply: arr(null), shape: "exec" };
      }
    const q = ctx.queue;
    ctx.multi = false;
    ctx.queue = [];
    ctx.watches.clear();
    const rs = q.map((command) => {
      try {
        return ctx.execute(command, false, false).reply;
      } catch (error) {
        return err((error as Error).message);
      }
    });
    return { reply: arr(rs), shape: "exec" };
  }
  if (n === "PING") return { reply: bulk(a[1] ?? "PONG"), shape: "scalar" };
  if (n === "ECHO") {
    arity(a, 2, n);
    return { reply: bulk(a[1]!), shape: "scalar" };
  }
  if (n === "TIME")
    return { reply: arr([bulk("1767225600"), bulk("0")]), shape: "values" };
  if (n === "DEL" || n === "UNLINK") {
    let z = 0;
    for (const x of a.slice(1)) if (ctx.db.del(x)) z++;
    return { reply: int(z), shape: "scalar" };
  }
  if (n === "EXISTS") {
    let z = 0;
    for (const x of a.slice(1)) if (get(x)) z++;
    return { reply: int(z), shape: "scalar" };
  }
  if (n === "TYPE")
    return { reply: status(get(k)?.type ?? "none"), shape: "scalar" };
  if (n === "DBSIZE")
    return { reply: int(ctx.db.keys().length), shape: "scalar" };
  if (n === "FLUSHDB" || n === "FLUSHALL") {
    ctx.db.map.clear();
    return { reply: status("OK"), shape: "scalar" };
  }
  if (n === "KEYS") {
    const re = globToRegExp(k!);
    return {
      reply: arr(
        ctx.db
          .keys()
          .filter((x) => re.test(x))
          .map(bulk),
      ),
      shape: "unordered",
    };
  }
  if (n === "SCAN") {
    const start = Number(k);
    let count = 10,
      match = "*",
      type = "";
    for (let i = 2; i < a.length; i++) {
      if (a[i]?.toUpperCase() === "COUNT") count = Number(a[i + 1]);
      if (a[i]?.toUpperCase() === "MATCH") match = a[i + 1]!;
      if (a[i]?.toUpperCase() === "TYPE") type = a[i + 1]!;
    }
    const keys = ctx.db
      .keys()
      .filter(
        (x) =>
          globToRegExp(match).test(x) &&
          (!type || ctx.db.get(x)?.type === type),
      );
    const page = keys.slice(start, start + count),
      next = start + count >= keys.length ? 0 : start + count;
    return {
      reply: arr([bulk(String(next)), arr(page.map(bulk))]),
      shape: "scan",
      notice: `Next cursor: ${next}`,
    };
  }
  if (n === "RENAME" || n === "RENAMENX") {
    const e = get(k);
    if (!e) throw new RedisError("ERR no such key");
    if (n === "RENAMENX" && get(a[2]))
      return { reply: int(0), shape: "scalar" };
    ctx.db.map.set(a[2]!, e);
    ctx.db.del(k!);
    return {
      reply: n === "RENAMENX" ? int(1) : status("OK"),
      shape: "scalar",
    };
  }
  if (n === "TTL" || n === "PTTL") {
    const e = get(k);
    if (!e) return { reply: int(-2), shape: "scalar" };
    return {
      reply: int(
        e.expiresAt === undefined
          ? -1
          : Math.max(
              -1,
              Math.floor((e.expiresAt - NOW_MS) / (n === "TTL" ? 1000 : 1)),
            ),
      ),
      shape: "scalar",
    };
  }
  if (n === "PERSIST") {
    const e = get(k);
    if (!e || e.expiresAt === undefined)
      return { reply: int(0), shape: "scalar" };
    delete e.expiresAt;
    ctx.db.touch(k!);
    return { reply: int(1), shape: "scalar" };
  }
  if (n === "EXPIRE" || n === "PEXPIRE" || n === "EXPIREAT") {
    const e = get(k);
    if (!e) return { reply: int(0), shape: "scalar" };
    let ms =
      n === "EXPIREAT"
        ? Number(a[2]) * 1000
        : Number(a[2]) * (n === "EXPIRE" ? 1000 : 1);
    if (ms <= 0 || (n === "EXPIREAT" ? ms : NOW_MS + ms) <= NOW_MS) {
      ctx.db.del(k!);
      return { reply: int(1), shape: "scalar" };
    }
    e.expiresAt = n === "EXPIREAT" ? ms : NOW_MS + ms;
    ctx.db.touch(k!);
    return { reply: int(1), shape: "scalar" };
  }
  if (n === "SET" || n === "SETEX" || n === "SETNX") {
    let value = n === "SETEX" ? a[3]! : n === "SETNX" ? a[2]! : a[2]!;
    let ttl: number | undefined =
      n === "SETEX" ? Number(a[2]) * 1000 : undefined;
    let nx = n === "SETNX",
      xx = false,
      getold = false,
      keepttl = false;
    for (let i = n === "SET" ? 3 : 4; i < a.length; i++) {
      const o = a[i]!.toUpperCase();
      if (o === "NX") nx = true;
      else if (o === "XX") xx = true;
      else if (o === "GET") getold = true;
      else if (o === "KEEPTTL") keepttl = true;
      else if (o === "EX") ttl = Number(a[++i]) * 1000;
      else if (o === "PX") ttl = Number(a[++i]);
      else if (o === "EXAT") ttl = Number(a[++i]) * 1000;
    }
    const old = get(k);
    if ((nx && old) || (xx && !old))
      return {
        reply: getold ? bulk(old ? text(old) : null) : bulk(null),
        shape: "scalar",
      };
    const e = mktext(value);
    if (keepttl && old) e.expiresAt = old.expiresAt;
    if (ttl !== undefined) e.expiresAt = NOW_MS + ttl;
    ctx.db.set(k!, e);
    return {
      reply: getold ? bulk(old ? text(old) : null) : status("OK"),
      shape: "scalar",
    };
  }
  if (n === "GET" || n === "GETDEL") {
    const e = get(k, "string");
    const r = bulk(e ? text(e) : null);
    if (n === "GETDEL" && e) ctx.db.del(k!);
    return { reply: r, shape: "scalar" };
  }
  if (n === "GETEX") {
    const e = get(k, "string");
    if (e) {
      if (a[2]?.toUpperCase() === "PERSIST") delete e.expiresAt;
      else if (a[2])
        e.expiresAt =
          NOW_MS + Number(a[3]) * (a[2].toUpperCase() === "EX" ? 1000 : 1);
    }
    return { reply: bulk(e ? text(e) : null), shape: "scalar" };
  }
  if (n === "MSET" || n === "MSETNX") {
    if ((a.length - 1) % 2) throw new RedisError(ctx.arityError(n));
    if (
      n === "MSETNX" &&
      a
        .slice(1)
        .filter((_, i) => i % 2 === 0)
        .some((x) => get(x))
    )
      return { reply: int(0), shape: "scalar" };
    for (let i = 1; i < a.length; i += 2) ctx.db.set(a[i]!, mktext(a[i + 1]!));
    return { reply: n === "MSETNX" ? int(1) : status("OK"), shape: "scalar" };
  }
  if (n === "MGET") {
    return {
      reply: arr(
        a.slice(1).map((x) => {
          const e = get(x);
          return e?.type === "string" ? bulk(text(e)) : bulk(null);
        }),
      ),
      shape: "values",
    };
  }
  if (n === "APPEND") {
    const e = get(k, "string");
    const v = (e ? text(e) : "") + a[2];
    ctx.db.set(k!, mktext(v));
    return { reply: int(v.length), shape: "scalar" };
  }
  if (n === "STRLEN") {
    const e = get(k, "string");
    const v = e?.value as StringValue | undefined;
    // A bitmap is a string too: its length is its size in bytes.
    if (v?.kind === "bits") return { reply: int(v.bytes.length), shape: "scalar" };
    return { reply: int(e ? text(e).length : 0), shape: "scalar" };
  }
  if (n === "GETRANGE") {
    const s = get(k, "string");
    return {
      reply: bulk(s ? text(s).slice(Number(a[2]), Number(a[3]) + 1) : ""),
      shape: "scalar",
    };
  }
  if (["INCR", "DECR", "INCRBY", "DECRBY", "INCRBYFLOAT"].includes(n)) {
    const e = get(k, "string"),
      old = e ? text(e) : "0";
    let v: string;
    if (n === "INCRBYFLOAT")
      v = formatFloat(parseFloatArg(old) + parseFloatArg(a[2] ?? "0"));
    else {
      // Parse the increment before the stored value, so INCRBY k 1.5 gives the Redis error, not a BigInt crash.
      const step = n === "INCR" || n === "DECR" ? 1n : parseInteger(a[2] ?? "");
      const delta = n === "DECR" || n === "DECRBY" ? -step : step;
      const next = addInteger(parseInteger(old), delta);
      ctx.db.set(k!, mktext(String(next)));
      return { reply: int(Number(next)), shape: "scalar" };
    }
    ctx.db.set(k!, mktext(v));
    return { reply: bulk(v), shape: "scalar" };
  }
  return ctx.executeCollections(c);
}
