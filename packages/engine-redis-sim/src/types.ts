export const NOW_MS = 1767225600000;
export type RedisType = "string" | "hash" | "list" | "set" | "zset" | "stream";
export interface StreamEntry {
  id: string;
  fields: Record<string, string>;
}
export interface StreamGroup {
  lastDelivered: string;
  pending: Map<string, { consumer: string; deliveries: number }>;
}
export interface StreamValue {
  entries: StreamEntry[];
  lastId: string;
  groups: Map<string, StreamGroup>;
}
export type StringValue =
  | { kind: "text"; text: string }
  | { kind: "bits"; bytes: Uint8Array }
  | { kind: "hll"; members: Set<string> };
export type EntryValue =
  | StringValue
  | Map<string, string>
  | string[]
  | Set<string>
  | Map<string, number>
  | StreamValue;
export interface Entry {
  type: RedisType;
  value: EntryValue;
  expiresAt?: number;
}
export type Reply =
  | { t: "status"; v: string }
  | { t: "error"; v: string }
  | { t: "int"; v: number }
  | { t: "bulk"; v: string | null }
  | { t: "array"; v: Reply[] | null };
export type Shape =
  | "scalar"
  | "values"
  | "unordered"
  | "hvals"
  | "pairs"
  | "scored"
  | "scan"
  | "stream"
  | "xread"
  | "xpending"
  | "exec";
export class RedisError extends Error {}
