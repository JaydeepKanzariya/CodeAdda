import type {
  ColumnInfo,
  Dataset,
  Engine,
  QueryResult,
  SchemaInfo,
  TableInfo,
} from "@codeadda/core";
import {
  NOW_MS,
  RedisError,
  type Reply,
  type Shape,
  type StringValue,
  type StreamValue,
} from "./types";
import { tokenize, type Command } from "./tokenize";
import {
  addInteger,
  byteCompare,
  formatFloat,
  globToRegExp,
  mulberry32,
  parseFloatArg,
  parseInteger,
  parseScoreBound,
} from "./util";
import { renderCli, toTable } from "./format";
import { Keyspace, type StoredEntry, WRONG_TYPE } from "./keyspace";
import { COMMANDS, arityError, matchesArity } from "./registry";
import { executeCollections } from "./commands/collections";
import { executeCommand } from "./commands/dispatcher";
import { bitmap, hll } from "./commands/bits";
import { snapshotData, snapshotReply } from "./snapshot";
import { describe } from "./describe";

type AnyEntry = StoredEntry;
const status = (v: string): Reply => ({ t: "status", v }),
  int = (v: number): Reply => ({ t: "int", v }),
  bulk = (v: string | null): Reply => ({ t: "bulk", v }),
  arr = (v: Reply[] | null): Reply => ({ t: "array", v }),
  err = (v: string): Reply => ({ t: "error", v });
const wrong = WRONG_TYPE;

function text(e: AnyEntry): string {
  const v = e.value as StringValue;
  if (v.kind !== "text") throw new RedisError(wrong);
  return v.text;
}
function mktext(v: string): AnyEntry {
  return { type: "string", value: { kind: "text", text: v } };
}
function arity(args: string[], n: number, name: string) {
  if ((n > 0 && args.length !== n) || (n < 0 && args.length < -n))
    throw new RedisError(
      `ERR wrong number of arguments for '${name.toLowerCase()}' command`,
    );
}

export class RedisSimEngine implements Engine {
  readonly kind = "redis" as const;
  readonly mode = "browser" as const;
  private pristine = new Keyspace();
  private db = new Keyspace();
  private descriptions: Record<string, string> = {};
  private rng = mulberry32(1);
  private config = { maxmemory: "0", "maxmemory-policy": "noeviction" };
  private multi = false;
  private queue: Command[] = [];
  private dirty = false;
  private watches = new Map<string, number>();
  private streamSeq = 0;
  async setup(dataset: Dataset) {
    this.pristine = new Keyspace();
    this.descriptions = {};
    for (const line of dataset.source.split(/\r?\n/)) {
      const m = line.match(/^\s*#\s*@describe\s+(\S+)\s+(.+)$/);
      if (m) this.descriptions[m[1]!] = m[2]!;
    }
    const old = this.db;
    this.db = this.pristine;
    try {
      for (const c of tokenize(dataset.source)) {
        if (c.args[0]!.startsWith("#")) continue;
        const r = this.execute(c, false, true);
        if (r.reply.t === "error")
          throw new Error(`${r.reply.v} (line ${c.line})`);
      }
    } finally {
      this.pristine = this.db;
      this.db = old;
    }
    await this.reset();
  }
  async reset() {
    this.db = this.pristine.clone();
    this.rng = mulberry32(1);
    this.multi = false;
    this.queue = [];
    this.dirty = false;
    this.watches.clear();
    this.streamSeq = 0;
  }
  async dispose() {
    this.db.map.clear();
    this.pristine.map.clear();
  }
  async snapshot(q: string) {
    return this.process(q, true);
  }
  async run(q: string) {
    return this.process(q, false);
  }
  private async process(script: string, snap: boolean): Promise<QueryResult> {
    const t = performance.now();
    let commands: Command[];
    try {
      commands = tokenize(script);
    } catch (e: unknown) {
      const x = e instanceof Error ? e : new Error(String(e));
      const syntax = e as { column?: number };
      return {
        ok: false,
        error: { message: x.message, position: syntax.column },
      };
    }
    const docs: string[] = [];
    let last: Reply = status("OK"),
      shape: Shape = "scalar",
      name = "";
    let notice: string | undefined;
    for (const c of commands) {
      name = (c.args[0] ?? "").toUpperCase();
      let r: Reply;
      try {
        if (snap && name === "SNAPSHOT") {
          const x = this.snapshotReply(c.args.slice(1));
          r = x.reply;
          shape = "pairs";
        } else if (snap && this.isWrite(name))
          throw new RedisError("Checks can only read");
        else if (
          this.multi &&
          name !== "EXEC" &&
          name !== "DISCARD" &&
          name !== "WATCH" &&
          name !== "UNWATCH" &&
          name !== "MULTI"
        ) {
          if (!this.known(name) || this.badArity(c.args)) {
            this.dirty = true;
            r = err(
              this.known(name)
                ? this.arityError(name)
                : `ERR unknown command '${c.args[0]}', with args beginning with: ${c.args
                    .slice(1, 3)
                    .map((x) => `'${x}'`)
                    .join(" ")}`,
            );
          } else {
            this.queue.push(c);
            r = status("QUEUED");
          }
        } else if (this.known(name) && this.badArity(c.args)) {
          throw new RedisError(this.arityError(name));
        } else {
          const x = this.execute(c, snap, false);
          r = x.reply;
          shape = x.shape;
          notice = x.notice;
        }
      } catch (e) {
        const msg = (e as Error).message;
        r = err(msg);
        if (!this.multi || name === "EXEC" || name === "MULTI")
          return { ok: false, error: { message: `${msg} — line ${c.line}` } };
      }
      docs.push(`redis> ${c.args.join(" ")}\n${renderCli(r)}`);
      last = r;
      if (name === "EXEC" && r.t === "error")
        return { ok: false, error: { message: `${r.v} — line ${c.line}` } };
    }
    if (
      this.multi &&
      !commands.some(
        (c) =>
          c.args[0]!.toUpperCase() === "EXEC" ||
          c.args[0]!.toUpperCase() === "DISCARD",
      )
    ) {
      this.multi = false;
      this.queue = [];
      this.dirty = false;
      notice = "Transaction was never executed and has been discarded.";
    }
    const snapRows =
      name === "SNAPSHOT"
        ? this.snapshotData(commands.at(-1)?.args.slice(1) ?? [])
        : undefined;
    const tab = snapRows
      ? { columns: ["key", "type", "ttl", "value"], rows: snapRows }
      : toTable(last, shape, name);
    return {
      ok: true,
      ...tab,
      rowCount: tab.rows.length,
      durationMs: Math.round(performance.now() - t),
      documents: docs,
      notice,
    };
  }
  private known(n: string) {
    return [
      "PING",
      "ECHO",
      "TIME",
      "DEL",
      "UNLINK",
      "EXISTS",
      "TYPE",
      "RENAME",
      "RENAMENX",
      "KEYS",
      "SCAN",
      "DBSIZE",
      "FLUSHDB",
      "FLUSHALL",
      "EXPIRE",
      "PEXPIRE",
      "EXPIREAT",
      "TTL",
      "PTTL",
      "PERSIST",
      "SET",
      "GET",
      "GETDEL",
      "GETEX",
      "SETEX",
      "SETNX",
      "MSET",
      "MSETNX",
      "MGET",
      "APPEND",
      "STRLEN",
      "GETRANGE",
      "INCR",
      "DECR",
      "INCRBY",
      "DECRBY",
      "INCRBYFLOAT",
      "HSET",
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
      "HMSET",
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
      "ZREMRANGEBYSCORE",
      "ZREMRANGEBYRANK",
      "ZPOPMIN",
      "ZPOPMAX",
      "ZUNIONSTORE",
      "ZINTERSTORE",
      "ZREVRANGE",
      "ZRANGEBYSCORE",
      "ZRANDMEMBER",
      "SETBIT",
      "GETBIT",
      "BITCOUNT",
      "BITOP",
      "PFADD",
      "PFCOUNT",
      "PFMERGE",
      "XADD",
      "XLEN",
      "XRANGE",
      "XREVRANGE",
      "XDEL",
      "XTRIM",
      "XREAD",
      "XGROUP",
      "XREADGROUP",
      "XACK",
      "XPENDING",
      "MULTI",
      "EXEC",
      "DISCARD",
      "WATCH",
      "UNWATCH",
      "CONFIG",
      "SNAPSHOT",
    ].includes(n);
  }
  private badArity(a: string[]) {
    const n = a[0]!.toUpperCase();
    const spec = COMMANDS.get(n);
    return (
      (spec !== undefined && !matchesArity(spec, a.length)) ||
      (n === "HSET" && (a.length < 4 || (a.length - 2) % 2 !== 0))
    );
  }
  private arityError(n: string) {
    return `ERR wrong number of arguments for '${n.toLowerCase()}' command`;
  }
  private isWrite(n: string) {
    return ![
      "PING",
      "ECHO",
      "TIME",
      "GET",
      "MGET",
      "TYPE",
      "EXISTS",
      "KEYS",
      "SCAN",
      "DBSIZE",
      "TTL",
      "PTTL",
      "STRLEN",
      "GETRANGE",
      "HGET",
      "HMGET",
      "HGETALL",
      "HEXISTS",
      "HKEYS",
      "HVALS",
      "HLEN",
      "LRANGE",
      "LLEN",
      "LINDEX",
      "SMEMBERS",
      "SISMEMBER",
      "SMISMEMBER",
      "SCARD",
      "SINTER",
      "SUNION",
      "SDIFF",
      "ZSCORE",
      "ZMSCORE",
      "ZCARD",
      "ZCOUNT",
      "ZRANK",
      "ZREVRANK",
      "ZRANGE",
      "GETBIT",
      "BITCOUNT",
      "PFCOUNT",
      "XLEN",
      "XRANGE",
      "XREVRANGE",
      "XPENDING",
      "CONFIG",
    ].includes(n);
  }
  private execute(
    c: Command,
    snapshot = false,
    setup = false,
  ): { reply: Reply; shape: Shape; notice?: string } {
    const state = {
      db: this.db,
      multi: this.multi,
      queue: this.queue,
      dirty: this.dirty,
      watches: this.watches,
      config: this.config,
    };
    const context = {
      ...state,
      arityError: (name: string) => this.arityError(name),
      execute: (command: Command, snap?: boolean, initial?: boolean) => {
        this.multi = context.multi;
        this.queue = context.queue;
        this.dirty = context.dirty;
        this.watches = context.watches;
        const result = this.execute(command, snap, initial);
        context.multi = this.multi;
        context.queue = this.queue;
        context.dirty = this.dirty;
        context.watches = this.watches;
        return result;
      },
      executeCollections: (command: Command) =>
        this.executeCollections(command),
    };
    const result = executeCommand(context, c, snapshot, setup);
    this.multi = context.multi;
    this.queue = context.queue;
    this.dirty = context.dirty;
    this.watches = context.watches;
    return result;
  }
  private executeCollections(c: Command): {
    reply: Reply;
    shape: Shape;
    notice?: string;
  } {
    return executeCollections(
      {
        db: this.db,
        nextStreamId: () => `${NOW_MS}-${this.streamSeq++}`,
        config: this.config,
        bitmap: (command) => this.bitmap(command),
        hll: (command) => this.hll(command),
      },
      c,
    );
  }
  private bitmap(c: Command): { reply: Reply; shape: Shape } {
    return bitmap({ db: this.db }, c);
  }
  private hll(c: Command): { reply: Reply; shape: Shape } {
    return hll({ db: this.db }, c);
  }
  private snapshotReply(globs: string[]) {
    return snapshotReply({ db: this.db }, globs);
  }
  private snapshotData(globs: string[]) {
    return snapshotData({ db: this.db }, globs);
  }
  async describe(): Promise<SchemaInfo> {
    return describe({ db: this.db, descriptions: this.descriptions });
  }
}
