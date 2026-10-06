import type { ColumnInfo, SchemaInfo, TableInfo } from "@codeadda/core";
import { Keyspace } from "./keyspace";
export interface DescribeContext {
  db: Keyspace;
  descriptions: Record<string, string>;
}
export function describe(ctx: DescribeContext): SchemaInfo {
  const groups = new Map<string, string[]>();
  for (const k of ctx.db.keys()) {
    const p = k.includes(":") ? k.replace(/[^:]+$/, "*") : k;
    groups.set(p, [...(groups.get(p) ?? []), k]);
  }
  const tables: TableInfo[] = [];
  for (const [name, keys] of groups) {
    const same = keys.length >= 2;
    const key = name === "*" ? keys[0]! : keys[0]!;
    const e = ctx.db.get(key)!;
    const display = same ? name : key;
    let columns: ColumnInfo[];
    if (e.type === "hash") {
      const f = new Set<string>();
      for (const k of keys)
        for (const x of (ctx.db.get(k)!.value as Map<string, string>).keys())
          f.add(x);
      columns = [...f].sort().map((x) => ({
        name: x,
        type: "field",
        nullable: true,
        isPrimary: false,
        isForeign: false,
      }));
    } else
      columns = [
        {
          name: "key",
          type: "string",
          nullable: false,
          isPrimary: true,
          isForeign: false,
        },
        {
          name: "type",
          type: e.type,
          nullable: false,
          isPrimary: false,
          isForeign: false,
        },
        {
          name: "size",
          type: "integer",
          nullable: false,
          isPrimary: false,
          isForeign: false,
        },
        {
          name: "ttl",
          type: "integer",
          nullable: false,
          isPrimary: false,
          isForeign: false,
        },
      ];
    tables.push({
      name: display,
      description: ctx.descriptions[name],
      rowCount: keys.length,
      columns,
      sampleQuery:
        e.type === "hash"
          ? `HGETALL ${key}`
          : e.type === "list"
            ? `LRANGE ${key} 0 9`
            : e.type === "set"
              ? `SMEMBERS ${key}`
              : e.type === "zset"
                ? `ZRANGE ${key} 0 9 WITHSCORES`
                : e.type === "stream"
                  ? `XRANGE ${key} - + COUNT 5`
                  : `GET ${key}`,
    });
  }
  return {
    tables: tables.sort((a, b) => a.name.localeCompare(b.name)),
    relationships: [],
  };
}
