import { describe, expect, it } from "vitest";
import { RedisSimEngine } from "./RedisSimEngine";
async function query(script: string) {
  const e = new RedisSimEngine();
  await e.setup({ name: "test", source: "" });
  const r = await e.run(script);
  if (!r.ok) throw new Error(r.error.message);
  return r;
}
describe("Redis list edge cases", () => {
  it("moves the rightmost item to the destination left", async () => {
    expect((await query("RPUSH l a b c\nRPOPLPUSH l l2\nLRANGE l2 0 -1")).rows)
      .toEqual([["c"]]);
  });
  it("implements LSET, LINSERT, LPOS and deletes empty lists", async () => {
    expect((await query("RPUSH l a b\nLSET l 0 z\nLINSERT l AFTER z x\nLPOS l x\nLPOP l 3\nEXISTS l")).rows)
      .toEqual([["EXISTS", 0]]);
    const e = new RedisSimEngine();
    await e.setup({ name: "test", source: "" });
    const r = await e.run("LSET l 99 x");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain("ERR index out of range");
  });
});
