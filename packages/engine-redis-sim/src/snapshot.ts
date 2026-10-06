import {
  NOW_MS,
  type Reply,
  type Shape,
  type StreamValue,
  type StringValue,
} from "./types";
import { Keyspace } from "./keyspace";
import { byteCompare, globToRegExp } from "./util";
import { compareId as compareStreamIds } from "./commands/streams";

export interface SnapshotOptions {
  globs: string[];
}

export interface SnapshotContext {
  db: Keyspace;
}

type SnapshotRow = [string, string, number, unknown];

const bulk = (v: string | null): Reply => ({ t: "bulk", v });
const arr = (v: Reply[] | null): Reply => ({ t: "array", v });

function valueOf(entry: ReturnType<Keyspace["get"]>): unknown {
  if (!entry) return null;
  if (entry.type === "string") {
    const value = entry.value as StringValue;
    if (value.kind === "text") return value.text;
    if (value.kind === "hll") return { hll: value.members.size };
    return [...value.bytes]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  if (entry.type === "hash")
    return Object.fromEntries([...(entry.value as Map<string, string>)].sort());
  if (entry.type === "list") return [...(entry.value as string[])];
  if (entry.type === "set") return [...(entry.value as Set<string>)].sort();
  if (entry.type === "zset")
    return [...(entry.value as Map<string, number>)].sort(
      (left, right) => left[1] - right[1] || byteCompare(left[0], right[0]),
    );
  const stream = entry.value as StreamValue;
  return {
    entries: stream.entries.map((item) => ({
      id: item.id,
      fields: item.fields,
    })),
    groups: Object.fromEntries(
      [...stream.groups]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, group]) => [
          name,
          {
            last_delivered: group.lastDelivered,
            // Record the consumer too, so a check can tell which worker took each entry.
            pending: [...group.pending]
              .map(([id, item]) => ({ id, consumer: item.consumer }))
              .sort((x, y) => compareStreamIds(x.id, y.id)),
          },
        ]),
    ),
  };
}

export function snapshotData(
  ctx: SnapshotContext,
  globs: string[],
): SnapshotRow[] {
  return ctx.db
    .keys()
    .filter(
      (key) =>
        globs.length === 0 ||
        globs.some((glob) => globToRegExp(glob).test(key)),
    )
    .map((key) => {
      const entry = ctx.db.get(key)!;
      const ttl =
        entry.expiresAt === undefined
          ? -1
          : Math.floor((entry.expiresAt - NOW_MS) / 1000);
      return [key, entry.type, ttl, valueOf(entry)];
    });
}

export function snapshotReply(
  ctx: SnapshotContext,
  globs: string[],
): { reply: Reply; shape: Shape } {
  const rows = snapshotData(ctx, globs);
  return {
    reply: arr(rows.flatMap((row) => row.map((value) => bulk(String(value))))),
    shape: "pairs",
  };
}
