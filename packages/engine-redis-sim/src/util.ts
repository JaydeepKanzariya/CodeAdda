import { RedisError } from "./types";
const MIN = -(2n ** 63n),
  MAX = 2n ** 63n - 1n;
export function parseInteger(s: string) {
  if (!/^-?\d+$/.test(s))
    throw new RedisError("ERR value is not an integer or out of range");
  const n = BigInt(s);
  if (n < MIN || n > MAX)
    throw new RedisError("ERR value is not an integer or out of range");
  return n;
}
export function addInteger(a: bigint, b: bigint) {
  const n = a + b;
  if (n < MIN || n > MAX)
    throw new RedisError("ERR increment or decrement would overflow");
  return n;
}
export function parseFloatArg(s: string) {
  const v =
    s === "inf" || s === "+inf"
      ? Infinity
      : s === "-inf"
        ? -Infinity
        : Number(s);
  if (s.trim() === "" || Number.isNaN(v))
    throw new RedisError("ERR value is not a valid float");
  return v;
}
export function formatFloat(v: number) {
  if (v === Infinity) return "inf";
  if (v === -Infinity) return "-inf";
  return String(Number(v.toPrecision(15)));
}
export function globToRegExp(g: string) {
  let r = "";
  for (let i = 0; i < g.length; i++) {
    const c = g[i]!;
    if (c === "\\" && i + 1 < g.length)
      r += g[++i]!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    else if (c === "*") r += ".*";
    else if (c === "?") r += ".";
    else if (c === "[") {
      const e = g.indexOf("]", i + 1);
      if (e < 0) r += "\\[";
      else {
        const b = g.slice(i + 1, e);
        r += `[${b.startsWith("^") ? "^" + b.slice(1) : b}]`;
        i = e;
      }
    } else r += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${r}$`, "s");
}
export function parseScoreBound(s: string) {
  const exclusive = s.startsWith("(");
  return { value: parseFloatArg(exclusive ? s.slice(1) : s), exclusive };
}
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const byteCompare = (a: string, b: string) =>
  a < b ? -1 : a > b ? 1 : 0;
