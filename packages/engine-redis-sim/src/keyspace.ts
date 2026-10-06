import {
  NOW_MS,
  RedisError,
  type Entry,
  type RedisType,
  type StreamValue,
  type StringValue,
} from "./types";
import { byteCompare } from "./util";

export type StoredEntry = Entry;
export const WRONG_TYPE =
  "WRONGTYPE Operation against a key holding the wrong kind of value";

function cloneEntry(entry: StoredEntry): StoredEntry {
  if (entry.type === "string") {
    const value = entry.value as StringValue;
    const copy: StringValue =
      value.kind === "text"
        ? { kind: "text", text: value.text }
        : value.kind === "bits"
          ? { kind: "bits", bytes: new Uint8Array(value.bytes) }
          : { kind: "hll", members: new Set(value.members) };
    return { ...entry, value: copy };
  }
  if (entry.type === "hash" || entry.type === "zset") {
    return {
      ...entry,
      value:
        entry.type === "hash"
          ? new Map(entry.value as Map<string, string>)
          : new Map(entry.value as Map<string, number>),
    };
  }
  if (entry.type === "list")
    return { ...entry, value: [...(entry.value as string[])] };
  if (entry.type === "set")
    return { ...entry, value: new Set(entry.value as Set<string>) };
  const stream = entry.value as StreamValue;
  return {
    ...entry,
    value: {
      entries: stream.entries.map((item) => ({
        id: item.id,
        fields: { ...item.fields },
      })),
      lastId: stream.lastId,
      groups: new Map(
        [...stream.groups].map(([name, group]) => [
          name,
          {
            lastDelivered: group.lastDelivered,
            pending: new Map(group.pending),
          },
        ]),
      ),
    },
  };
}

export class Keyspace {
  readonly map = new Map<string, StoredEntry>();
  readonly versions = new Map<string, number>();

  touch(key: string): void {
    this.versions.set(key, (this.versions.get(key) ?? 0) + 1);
  }

  get(key: string, type?: RedisType): StoredEntry | undefined {
    const entry = this.map.get(key);
    if (entry?.expiresAt !== undefined && entry.expiresAt <= NOW_MS) {
      this.map.delete(key);
      this.touch(key);
      return undefined;
    }
    if (entry && type && entry.type !== type) throw new RedisError(WRONG_TYPE);
    return entry;
  }

  set(key: string, entry: StoredEntry): void {
    this.map.set(key, entry);
    this.touch(key);
  }

  del(key: string): boolean {
    const deleted = this.map.delete(key);
    if (deleted) this.touch(key);
    return deleted;
  }

  keys(): string[] {
    return [...this.map.keys()].sort(byteCompare);
  }

  clone(): Keyspace {
    const copy = new Keyspace();
    for (const [key, entry] of this.map) copy.map.set(key, cloneEntry(entry));
    for (const [key, version] of this.versions) copy.versions.set(key, version);
    return copy;
  }
}
