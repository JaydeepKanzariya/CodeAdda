import { RedisError, type Reply, type Shape, type StringValue } from "../types";
import type { Command } from "../tokenize";
import { Keyspace } from "../keyspace";

export interface BitsContext {
  db: Keyspace;
}
const int = (v: number): Reply => ({ t: "int", v });
const status = (v: string): Reply => ({ t: "status", v });
const wrong =
  "WRONGTYPE Operation against a key holding the wrong kind of value";
export function bitmap(
  ctx: BitsContext,
  c: Command,
): { reply: Reply; shape: Shape } {
  const a = c.args,
    n = a[0]!.toUpperCase();
  if (n === "BITOP") return bitop(ctx, a);
  const ent = ctx.db.get(a[1]!);
  if (ent && ent.type !== "string") throw new RedisError(wrong);
  let sv = ent?.value as StringValue | undefined;
  let bytes = sv?.kind === "bits" ? sv.bytes : new Uint8Array();
  const bit = (off: number) => {
    const i = Math.floor(off / 8);
    if (i >= bytes.length) {
      const b = new Uint8Array(i + 1);
      b.set(bytes);
      bytes = b;
    }
    return i;
  };
  if (n === "SETBIT" || n === "GETBIT") {
    const off = Number(a[2]),
      i = bit(off),
      mask = 1 << (7 - (off % 8)),
      old = bytes[i]! & mask ? 1 : 0;
    if (n === "SETBIT") {
      if (Number(a[3])) bytes[i] |= mask;
      else bytes[i] &= ~mask;
      ctx.db.set(a[1]!, { type: "string", value: { kind: "bits", bytes } });
    }
    return { reply: int(old), shape: "scalar" };
  }
  if (n === "BITCOUNT") {
    let from = 0,
      to = bytes.length - 1;
    const unit = a[4]?.toUpperCase() ?? "BYTE";
    if (a.length === 3 || a.length > 5 || (unit !== "BYTE" && unit !== "BIT")) throw new RedisError("ERR syntax error");
    if (unit === "BIT") {
      // Bit offsets, inclusive; negative ones count from the end.
      const bits = bytes.length * 8;
      const at = (i: number) => (i < 0 ? Math.max(bits + i, 0) : i);
      const lo = at(parseIndex(a[2]!));
      const hi = Math.min(at(parseIndex(a[3]!)), bits - 1);
      let z = 0;
      for (let off = lo; off <= hi; off++) if (bytes[off >> 3]! & (1 << (7 - (off & 7)))) z++;
      return { reply: int(z), shape: "scalar" };
    }
    if (a.length >= 4) {
      // Byte offsets, inclusive; negative ones count from the end.
      const at = (i: number) => (i < 0 ? Math.max(bytes.length + i, 0) : i);
      from = at(parseIndex(a[2]!));
      to = Math.min(at(parseIndex(a[3]!)), bytes.length - 1);
    }
    let z = 0;
    for (let i = from; i <= to; i++) z += popcount(bytes[i]!);
    return { reply: int(z), shape: "scalar" };
  }
  throw new RedisError("ERR bit operation");
}

const OPS = new Set(["AND", "OR", "XOR", "NOT"]);

function popcount(b: number): number {
  let z = 0;
  for (let q = b; q; q >>>= 1) z += q & 1;
  return z;
}

function parseIndex(s: string): number {
  if (!/^-?\d+$/.test(s)) throw new RedisError("ERR value is not an integer or out of range");
  return Number(s);
}

/** BITOP op dest src...: missing keys and shorter inputs count as zero bytes; returns the result length. */
function bitop(ctx: BitsContext, a: string[]): { reply: Reply; shape: Shape } {
  const op = a[1]!.toUpperCase();
  if (!OPS.has(op)) throw new RedisError("ERR syntax error");
  const sources = a.slice(3);
  if (op === "NOT" && sources.length !== 1) throw new RedisError("ERR BITOP NOT must be called with a single source key.");
  const inputs = sources.map((k) => {
    const e = ctx.db.get(k);
    if (!e) return new Uint8Array();
    if (e.type !== "string") throw new RedisError(wrong);
    const v = e.value as StringValue;
    if (v.kind === "bits") return v.bytes;
    if (v.kind === "text") return Uint8Array.from(v.text, (ch) => ch.charCodeAt(0) & 0xff);
    throw new RedisError(wrong);
  });
  const len = Math.max(0, ...inputs.map((b) => b.length));
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    if (op === "NOT") {
      out[i] = ~(inputs[0]![i] ?? 0) & 0xff;
      continue;
    }
    let acc = inputs[0]![i] ?? 0;
    for (const b of inputs.slice(1)) {
      const x = b[i] ?? 0;
      acc = op === "AND" ? acc & x : op === "OR" ? acc | x : acc ^ x;
    }
    out[i] = acc;
  }
  if (len === 0) ctx.db.del(a[2]!);
  else ctx.db.set(a[2]!, { type: "string", value: { kind: "bits", bytes: out } });
  return { reply: int(len), shape: "scalar" };
}
export function hll(
  ctx: BitsContext,
  c: Command,
): { reply: Reply; shape: Shape } {
  const a = c.args,
    n = a[0]!.toUpperCase();
  const ensure = (k: string) => {
    const e = ctx.db.get(k);
    if (e && e.type !== "string") throw new RedisError(wrong);
    if (e && (e.value as StringValue).kind === "hll")
      return (e.value as Extract<StringValue, { kind: "hll" }>).members;
    const s = new Set<string>();
    ctx.db.set(k, { type: "string", value: { kind: "hll", members: s } });
    return s;
  };
  if (n === "PFADD") {
    const s = ensure(a[1]!);
    const old = s.size;
    for (const v of a.slice(2)) s.add(v);
    return { reply: int(s.size > old ? 1 : 0), shape: "scalar" };
  }
  if (n === "PFCOUNT") {
    const all = new Set<string>();
    for (const k of a.slice(1)) {
      const e = ctx.db.get(k);
      if (e?.type === "string" && (e.value as StringValue).kind === "hll")
        for (const v of (e.value as Extract<StringValue, { kind: "hll" }>)
          .members)
          all.add(v);
    }
    return { reply: int(all.size), shape: "scalar" };
  }
  const s = ensure(a[1]!);
  for (const k of a.slice(2)) {
    const e = ctx.db.get(k);
    if (e?.type === "string" && (e.value as StringValue).kind === "hll")
      for (const v of (e.value as Extract<StringValue, { kind: "hll" }>)
        .members)
        s.add(v);
  }
  return { reply: status("OK"), shape: "scalar" };
}
