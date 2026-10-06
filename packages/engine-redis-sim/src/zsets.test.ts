import { describe, expect, it } from "vitest";
import { RedisSimEngine } from "./RedisSimEngine";
const run = async (source: string, query: string) => {
  const e = new RedisSimEngine();
  await e.setup({ name: "test", source });
  const r = await e.run(query);
  if (!r.ok) throw new Error(r.error.message);
  return r;
};
describe("Redis sorted-set edge cases", () => {
  it("uses descending bounds and reverse tie ordering for BYSCORE REV", async () => {
    expect((await run("", "ZADD t 5 b 5 a 7 c\nZRANGE t +inf -inf BYSCORE REV")).rows)
      .toEqual([["c"], ["b"], ["a"]]);
  });
  it("returns the incremented score from ZADD INCR", async () => {
    expect((await run("", "ZADD t 5 c\nZADD t INCR 2 c")).rows)
      .toEqual([["ZADD", "7"]]);
    expect((await run("ZADD t 7 c", "ZSCORE t c")).rows).toEqual([["ZSCORE", "7"]]);
  });
  it("honors aggregate and weights for intersections", async () => {
    expect((await run("", "ZADD t 5 a 7 b\nZADD s 9 a 1 b\nZINTERSTORE u 2 t s WEIGHTS 2 1 AGGREGATE MAX\nZRANGE u 0 -1 WITHSCORES")).rows)
      .toEqual([["a", 10], ["b", 14]]);
    expect((await run("", "ZADD t 5 a\nZADD s 9 a\nZINTERSTORE u 2 t s AGGREGATE MIN\nZRANGE u 0 -1 WITHSCORES")).rows)
      .toEqual([["a", 5]]);
  });
  it("pops min and max and removes an empty zset", async () => {
    expect((await run("", "ZADD t 5 a 7 c 5 b\nZPOPMIN t\nZPOPMAX t 2\nEXISTS t")).rows)
      .toEqual([["EXISTS", 0]]);
  });
});
