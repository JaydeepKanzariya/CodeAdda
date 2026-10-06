import { describe, expect, it } from "vitest";
import { RedisSimEngine } from "./RedisSimEngine";
async function query(script: string) {
  const e = new RedisSimEngine();
  await e.setup({ name: "test", source: "" });
  const r = await e.run(script);
  if (!r.ok) throw new Error(r.error.message);
  return r;
}
describe("Redis stream edge cases", () => {
  it("renders fields as objects and trims MAXLEN", async () => {
    const r = await query("XADD st * f v\nXADD st MAXLEN ~ 1 * g w\nXLEN st\nXRANGE st - +");
    expect(r.rows).toEqual([["1767225600000-1", { g: "w" }]]);
  });
  it("rejects duplicate groups and acknowledges only delivered ids", async () => {
    const e = new RedisSimEngine();
    await e.setup({ name: "test", source: "" });
    expect((await e.run("XADD st 1-0 f v\nXGROUP CREATE st g 0")).ok).toBe(true);
    const duplicate = await e.run("XGROUP CREATE st g 0");
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.error.message).toContain("BUSYGROUP");
    const ack = await e.run("XACK st g 999-0");
    if (!ack.ok) throw new Error(ack.error.message);
    expect(ack.rows).toEqual([["XACK", 0]]);
  });
});

describe("Redis stream reads and IDs", () => {
  const seeded = async () => {
    const e = new RedisSimEngine();
    await e.setup({ name: "test", source: "XADD st 9-0 n 1\nXADD st 10-0 n 2\nXADD st 11-0 n 3" });
    return e;
  };
  const rows = async (e: RedisSimEngine, script: string) => {
    const r = await e.run(script);
    if (!r.ok) throw new Error(r.error.message);
    return r.rows;
  };

  it("orders IDs numerically, not as text (9-0 comes before 10-0)", async () => {
    const e = await seeded();
    expect(await rows(e, "XRANGE st 10-0 +")).toEqual([["10-0", { n: "2" }], ["11-0", { n: "3" }]]);
    expect(await rows(e, "XREAD STREAMS st 9-0")).toEqual([["st", "10-0", { n: "2" }], ["st", "11-0", { n: "3" }]]);
    expect((await e.run("XADD st 10-5 n 4")).ok).toBe(false);
  });

  it("returns nothing when no entry is newer than the given ID or $", async () => {
    const e = await seeded();
    expect(await rows(e, "XREAD STREAMS st 11-0")).toEqual([]);
    expect(await rows(e, "XREAD STREAMS st $")).toEqual([]);
    expect(await rows(e, "XREAD COUNT 5 STREAMS st 99-0")).toEqual([]);
  });

  it("accepts IDs without a sequence, like Redis (10 means 10-0)", async () => {
    const e = await seeded();
    expect(await rows(e, "XRANGE st 10 10")).toEqual([["10-0", { n: "2" }]]);
    expect(await rows(e, "XADD st 12 n 5")).toEqual([["XADD", "12-0"]]);
    expect(await rows(e, "XGROUP CREATE st g 0\nXREADGROUP GROUP g c COUNT 1 STREAMS st >\nXACK st g 9")).toEqual([["XACK", 1]]);
  });

  it("BLOCK still returns entries that are already there", async () => {
    const e = await seeded();
    expect(await rows(e, "XREAD BLOCK 1000 COUNT 1 STREAMS st 0")).toEqual([["st", "9-0", { n: "1" }]]);
    const empty = await e.run("XREAD BLOCK 1000 STREAMS st $");
    expect(empty).toMatchObject({ ok: true, rows: [], notice: "This lab never blocks: XREAD returned at once" });
  });

  it("a group created at $ only delivers entries added after it", async () => {
    const e = await seeded();
    expect(await rows(e, "XGROUP CREATE st g $\nXREADGROUP GROUP g c STREAMS st >")).toEqual([]);
    expect(await rows(e, "XADD st 20-0 n 9\nXREADGROUP GROUP g c STREAMS st >")).toEqual([["st", "20-0", { n: "9" }]]);
  });

  it("XREADGROUP with an ID replays only this consumer's pending entries", async () => {
    const e = await seeded();
    await rows(e, "XGROUP CREATE st g 0\nXREADGROUP GROUP g alice COUNT 2 STREAMS st >\nXREADGROUP GROUP g bob COUNT 1 STREAMS st >");
    expect(await rows(e, "XREADGROUP GROUP g alice STREAMS st 0")).toEqual([["st", "9-0", { n: "1" }], ["st", "10-0", { n: "2" }]]);
    expect(await rows(e, "XREADGROUP GROUP g bob STREAMS st 0")).toEqual([["st", "11-0", { n: "3" }]]);
    expect(await e.run("XREADGROUP GROUP nope c STREAMS st >")).toMatchObject({ ok: false, error: { message: expect.stringMatching(/^NOGROUP/) } });
  });

  it("snapshots record which consumer holds each pending entry", async () => {
    const e = await seeded();
    await rows(e, "XGROUP CREATE st g 0\nXREADGROUP GROUP g worker-b COUNT 1 STREAMS st >");
    const snap = await e.snapshot("SNAPSHOT st");
    if (!snap.ok) throw new Error(snap.error.message);
    expect((snap.rows[0]![3] as { groups: unknown }).groups).toEqual({
      g: { last_delivered: "9-0", pending: [{ id: "9-0", consumer: "worker-b" }] },
    });
  });
});
