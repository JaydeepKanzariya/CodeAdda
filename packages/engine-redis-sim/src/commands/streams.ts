import { RedisError, type Reply, type Shape, type StreamValue } from "../types";
import type { Command } from "../tokenize";
import type { Keyspace } from "../keyspace";

export interface FamilyContext {
  db: Keyspace;
  nextStreamId: () => string;
}

type Result = { reply: Reply; shape: Shape; notice?: string };
type StreamEntryValue = { id: string; fields: Record<string, string> };

const status = (v: string): Reply => ({ t: "status", v });
const int = (v: number): Reply => ({ t: "int", v });
const bulk = (v: string | null): Reply => ({ t: "bulk", v });
const arr = (v: Reply[] | null): Reply => ({ t: "array", v });
const NEVER_BLOCKS = "This lab never blocks: XREAD returned at once";

/** Stream IDs are "<ms>-<seq>"; compare them as numbers, never as text ("9-0" < "10-0"). */
function parseId(id: string): [bigint, bigint] {
  const m = /^(\d+)(?:-(\d+))?$/.exec(id);
  if (!m) throw new RedisError("ERR Invalid stream ID specified as stream command argument");
  return [BigInt(m[1]!), BigInt(m[2] ?? 0)];
}
export function compareId(a: string, b: string): number {
  const [am, as] = parseId(a);
  const [bm, bs] = parseId(b);
  return am === bm ? (as === bs ? 0 : as < bs ? -1 : 1) : am < bm ? -1 : 1;
}
/** "10" → "10-0", like Redis does for IDs given without a sequence. */
function normalizeId(id: string): string {
  const [ms, seq] = parseId(id);
  return `${ms}-${seq}`;
}

const entryReply = (entry: StreamEntryValue): Reply =>
  arr([bulk(entry.id), arr(Object.entries(entry.fields).flatMap(([k, v]) => [bulk(k), bulk(v)]))]);

const xreadReply = (key: string, entries: StreamEntryValue[]): Reply =>
  arr(entries.map((entry) => arr([bulk(key), arr([entryReply(entry)])])));

function optionValue(args: string[], name: string): string | undefined {
  const i = args.findIndex((value) => value.toUpperCase() === name);
  return i >= 0 ? args[i + 1] : undefined;
}

function deleteIfEmpty(ctx: FamilyContext, key: string, stream: StreamValue): void {
  if (!stream.entries.length && !stream.groups.size) ctx.db.del(key);
}

export function executeStreams(ctx: FamilyContext, c: Command): Result {
  const a = c.args;
  const n = a[0]!.toUpperCase();
  const streamsAt = a.findIndex((value) => value.toUpperCase() === "STREAMS");
  const key = n === "XGROUP" ? a[2]! : streamsAt >= 0 ? a[streamsAt + 1]! : a[1]!;
  let stream = ctx.db.get(key, "stream")?.value as StreamValue | undefined;

  if (!stream) {
    if (n === "XADD" || (n === "XGROUP" && a.some((v) => v.toUpperCase() === "MKSTREAM"))) {
      stream = { entries: [], lastId: "0-0", groups: new Map() };
      ctx.db.set(key, { type: "stream", value: stream });
    } else if (n === "XGROUP") {
      throw new RedisError("ERR The XGROUP subcommand requires the key to exist. Note that for CREATE you may want to use the MKSTREAM option to create an empty stream automatically.");
    } else if (n === "XREADGROUP") {
      throw new RedisError(`NOGROUP No such key '${key}' or consumer group '${a[2]}' in XREADGROUP with GROUP option`);
    } else if (n === "XREAD" || n === "XRANGE" || n === "XREVRANGE") {
      return { reply: arr([]), shape: n === "XREAD" ? "xread" : "stream" };
    } else if (n === "XPENDING") {
      return { reply: arr([int(0), bulk(null), bulk(null), arr([])]), shape: "xpending" };
    } else {
      return { reply: int(0), shape: "scalar" }; // XLEN, XACK, XDEL, XTRIM on a missing key
    }
  }
  const entries = stream.entries as StreamEntryValue[];

  if (n === "XGROUP") {
    const sub = a[1]?.toUpperCase();
    if (sub === "CREATE") {
      if (stream.groups.has(a[3]!)) throw new RedisError("BUSYGROUP Consumer Group name already exists");
      stream.groups.set(a[3]!, {
        lastDelivered: a[4] === "$" ? stream.lastId : normalizeId(a[4]!),
        pending: new Map(),
      });
      return { reply: status("OK"), shape: "scalar" };
    }
    if (sub === "DESTROY") return { reply: int(stream.groups.delete(a[3]!) ? 1 : 0), shape: "scalar" };
    throw new RedisError(`ERR unknown subcommand '${a[1]}'. Try XGROUP HELP.`);
  }

  if (n === "XADD") {
    let i = 2;
    let maxLength: number | undefined;
    if (a[i]?.toUpperCase() === "MAXLEN") {
      i++;
      if (a[i] === "~" || a[i] === "=") i++;
      maxLength = Number(a[i++]);
    }
    const id = a[i] === "*" ? ctx.nextStreamId() : normalizeId(a[i]!);
    if (compareId(id, stream.lastId) <= 0) {
      throw new RedisError("ERR The ID specified in XADD is equal or smaller than the target stream top item");
    }
    const fields: Record<string, string> = {};
    for (let f = i + 1; f + 1 < a.length; f += 2) fields[a[f]!] = a[f + 1]!;
    entries.push({ id, fields });
    stream.lastId = id;
    if (maxLength !== undefined && entries.length > maxLength) entries.splice(0, entries.length - maxLength);
    return { reply: bulk(id), shape: "scalar" };
  }

  if (n === "XLEN") return { reply: int(entries.length), shape: "scalar" };

  if (n === "XRANGE" || n === "XREVRANGE") {
    // XRANGE key start end; XREVRANGE key end start. A bare ms bound covers every sequence in that ms.
    const [lowRaw, highRaw] = n === "XRANGE" ? [a[2]!, a[3]!] : [a[3]!, a[2]!];
    const inRange = (id: string) => {
      const low =
        lowRaw === "-" || (lowRaw.startsWith("(") ? compareId(id, lowRaw.slice(1)) > 0 : compareId(id, lowRaw) >= 0);
      const highBound = /^\d+$/.test(highRaw) ? `${highRaw}-18446744073709551615` : highRaw;
      const high =
        highRaw === "+" ||
        (highBound.startsWith("(") ? compareId(id, highBound.slice(1)) < 0 : compareId(id, highBound) <= 0);
      return low && high;
    };
    let picked = entries.filter((entry) => inRange(entry.id));
    if (n === "XREVRANGE") picked = picked.reverse();
    const count = optionValue(a, "COUNT");
    if (count !== undefined) picked = picked.slice(0, Number(count));
    return { reply: arr(picked.map(entryReply)), shape: "stream" };
  }

  if (n === "XACK") {
    const group = stream.groups.get(a[2]!);
    let acked = 0;
    for (const id of a.slice(3)) if (group?.pending.delete(normalizeId(id))) acked++;
    return { reply: int(acked), shape: "scalar" };
  }

  if (n === "XDEL") {
    const ids = new Set(a.slice(2).map(normalizeId));
    const before = entries.length;
    stream.entries = entries.filter((entry) => !ids.has(entry.id));
    const removed = before - stream.entries.length;
    deleteIfEmpty(ctx, key, stream);
    return { reply: int(removed), shape: "scalar" };
  }

  if (n === "XTRIM") {
    const at = a.findIndex((value) => value.toUpperCase() === "MAXLEN");
    const limit = Number(a[at + (a[at + 1] === "~" || a[at + 1] === "=" ? 2 : 1)]);
    const removed = Math.max(0, entries.length - limit);
    if (removed) entries.splice(0, removed);
    deleteIfEmpty(ctx, key, stream);
    return { reply: int(removed), shape: "scalar" };
  }

  if (n === "XPENDING") {
    const group = stream.groups.get(a[2]!);
    if (!group) throw new RedisError(`NOGROUP No such key '${key}' or consumer group '${a[2]}'`);
    const pending = [...group.pending].sort(([x], [y]) => compareId(x, y));
    const consumers = new Map<string, number>();
    for (const [, item] of pending) consumers.set(item.consumer, (consumers.get(item.consumer) ?? 0) + 1);
    return {
      reply: arr([
        int(pending.length),
        bulk(pending[0]?.[0] ?? null),
        bulk(pending.at(-1)?.[0] ?? null),
        arr([...consumers].flatMap(([consumer, count]) => [bulk(consumer), int(count)])),
      ]),
      shape: "xpending",
    };
  }

  if (n === "XREAD" || n === "XREADGROUP") {
    const blocking = a.some((value) => value.toUpperCase() === "BLOCK");
    const countArg = optionValue(a, "COUNT");
    const limit = countArg === undefined ? Infinity : Number(countArg);
    const marker = a[streamsAt + 2]!;
    let picked: StreamEntryValue[];

    if (n === "XREADGROUP") {
      const group = stream.groups.get(a[2]!);
      if (!group) {
        throw new RedisError(`NOGROUP No such key '${key}' or consumer group '${a[2]}' in XREADGROUP with GROUP option`);
      }
      const consumer = a[3]!;
      if (marker === ">") {
        // New entries only: deliver them to this consumer and add them to its pending list.
        picked = entries.filter((entry) => compareId(entry.id, group.lastDelivered) > 0).slice(0, limit);
        for (const entry of picked) {
          group.lastDelivered = entry.id;
          group.pending.set(entry.id, { consumer, deliveries: 1 });
        }
      } else {
        // An explicit ID replays this consumer's own pending entries after that ID.
        const after = normalizeId(marker);
        picked = entries
          .filter((entry) => group.pending.get(entry.id)?.consumer === consumer && compareId(entry.id, after) > 0)
          .slice(0, limit);
        for (const entry of picked) group.pending.get(entry.id)!.deliveries++;
      }
    } else {
      const after = marker === "$" ? stream.lastId : normalizeId(marker);
      picked = entries.filter((entry) => compareId(entry.id, after) > 0).slice(0, limit);
    }

    if (!picked.length) {
      return { reply: arr([]), shape: "xread", ...(blocking ? { notice: NEVER_BLOCKS } : {}) };
    }
    return { reply: xreadReply(key, picked), shape: "xread" };
  }

  throw new RedisError(`ERR unknown stream command '${n}'`);
}
