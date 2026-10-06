import { describe, expect, it } from "vitest";
import { RedisSimEngine } from "./RedisSimEngine";
describe("Redis transaction edge cases", () => {
  it("reports a watched abort as EXEC null", async () => {
    const e = new RedisSimEngine();
    await e.setup({ name: "test", source: "SET wallet:101 500\nSET wallet:102 120" });
    const r = await e.run("WATCH wallet:101\nINCR wallet:101\nMULTI\nINCR wallet:102\nEXEC");
    if (!r.ok) throw new Error(r.error.message);
    expect(r.columns).toEqual(["command", "result"]);
    expect(r.rows).toEqual([["EXEC", null]]);
  });
  it("rejects nested MULTI", async () => {
    const e = new RedisSimEngine();
    await e.setup({ name: "test", source: "" });
    const r = await e.run("MULTI\nMULTI");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain("MULTI calls can not be nested");
  });
});
