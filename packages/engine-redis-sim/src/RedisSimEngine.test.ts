import { describe, expect, it } from "vitest";
import type { QueryResult } from "@codeadda/core";
import { RedisSimEngine } from "./RedisSimEngine";

const ok = (result: QueryResult) => {
  if (!result.ok) throw new Error(result.error.message);
  return result;
};

async function engine(source = "") {
  const instance = new RedisSimEngine();
  await instance.setup({ name: "test", source });
  return instance;
}

describe("Redis engine arity", () => {
  it("reports missing arguments with the command line", async () => {
    const result = await (await engine()).run("PING\nGET");
    expect(result).toMatchObject({
      ok: false,
      error: {
        message: "ERR wrong number of arguments for 'get' command — line 2",
      },
    });
  });
});

describe("Redis sorted sets", () => {
  it("supports score ordering, options, and score ranges", async () => {
    const redis = await engine();
    expect(
      ok(await redis.run("ZADD t 5 b 5 a 7 c\nZRANGE t 0 -1 REV WITHSCORES"))
        .rows,
    ).toEqual([
      ["c", 7],
      ["b", 5],
      ["a", 5],
    ]);
    expect(
      ok(await redis.run("ZRANGE t (5 +inf BYSCORE WITHSCORES")).rows,
    ).toEqual([["c", 7]]);
    expect(
      ok(
        await redis.run(
          "ZADD t GT 1 c\nZADD t NX 9 c\nZADD t XX 9 zz\nZSCORE t c",
        ),
      ).rows,
    ).toEqual([["ZSCORE", "7"]]);
    expect(ok(await redis.run("ZREVRANGE t 0 1 WITHSCORES")).rows).toEqual([
      ["c", 7],
      ["b", 5],
    ]);
    expect(ok(await redis.run("ZRANGEBYSCORE t 5 7")).rows).toEqual([
      ["a"],
      ["b"],
      ["c"],
    ]);
  });
});

describe("Redis sets and lists", () => {
  it("supports membership batches and moving list endpoints", async () => {
    const redis = await engine();
    expect(
      ok(await redis.run("SADD friends a b\nSMISMEMBER friends a z")).rows,
    ).toEqual([[1], [0]]);
    expect(
      ok(await redis.run("LPUSH source a b c\nLMOVE source target LEFT RIGHT"))
        .rows,
    ).toEqual([["LMOVE", "c"]]);
    expect(ok(await redis.run("LRANGE target 0 -1")).rows).toEqual([["c"]]);
    expect(ok(await redis.run("LPOP source 2")).rows).toEqual([["b"], ["a"]]);
  });
});

describe("Redis transactions", () => {
  it("executes successful queued writes while returning per-command errors", async () => {
    const redis = await engine("SET wallet:101 500\nSET user:101 text");
    const result = ok(
      await redis.run("MULTI\nINCRBY wallet:101 10\nINCR user:101\nEXEC"),
    );
    expect(result.columns).toEqual(["index", "reply"]);
    expect(result.rows).toEqual([
      [1, 510],
      [2, "ERR value is not an integer or out of range"],
    ]);
    expect(ok(await redis.run("GET wallet:101")).rows).toEqual([
      ["GET", "510"],
    ]);
  });
});

describe("Redis streams", () => {
  it("supports groups, pending entries, acknowledgements, and ids", async () => {
    const redis = await engine();
    const result = ok(
      await redis.run(
        "XGROUP CREATE missing g $ MKSTREAM\n" +
          "XADD missing * f v\n" +
          "XADD missing * g w\n" +
          "XREADGROUP GROUP g c1 COUNT 1 STREAMS missing >",
      ),
    );
    expect(result.rows).toHaveLength(1);
    expect(ok(await redis.run("XPENDING missing g")).rows[0]?.[0]).toBe(1);
    const pending = ok(await redis.run("XPENDING missing g"));
    expect(pending.columns).toEqual(["count", "min_id", "max_id", "consumers"]);
    const id = pending.rows[0]?.[1];
    expect(ok(await redis.run(`XACK missing g ${String(id)}`)).rows).toEqual([
      ["XACK", 1],
    ]);
  });
});

describe("Redis snapshots", () => {
  it("serializes hashes, sets, sorted sets, streams, HLLs, and bitmaps", async () => {
    const redis = await engine();
    await redis.run(
      "HSET h b 2 a 1\nSADD s z a\nZADD z 2 b 1 a\n" +
        "XADD stream * f v\nPFADD hll one two\nSETBIT bitmap 0 1",
    );
    const result = ok(await redis.snapshot("SNAPSHOT *"));
    expect(result.columns).toEqual(["key", "type", "ttl", "value"]);
    expect(result.rows.map((row) => row[0])).toEqual([
      "bitmap",
      "h",
      "hll",
      "s",
      "stream",
      "z",
    ]);
    expect(result.rows.find((row) => row[0] === "h")?.[3]).toEqual({
      a: "1",
      b: "2",
    });
    expect(result.rows.find((row) => row[0] === "hll")?.[3]).toEqual({
      hll: 2,
    });
  });

  it("includes stream consumer groups and pending ids", async () => {
    const redis = await engine();
    await redis.run(
      "XADD events:matches * event one\n" +
        "XGROUP CREATE events:matches scorers 0\n" +
        "XREADGROUP GROUP scorers worker-a COUNT 1 STREAMS events:matches >",
    );
    const result = ok(await redis.snapshot("SNAPSHOT events:*"));
    expect(result.rows).toEqual([
      [
        "events:matches",
        "stream",
        -1,
        {
          entries: [{ id: "1767225600000-0", fields: { event: "one" } }],
          groups: {
            scorers: {
              last_delivered: "1767225600000-0",
              pending: [{ id: "1767225600000-0", consumer: "worker-a" }],
            },
          },
        },
      ],
    ]);
  });
});
