import type { Reply, Shape } from "./types";
export function renderCli(r: Reply): string {
  if (r.t === "status") return r.v;
  if (r.t === "error") return `(error) ${r.v}`;
  if (r.t === "int") return `(integer) ${r.v}`;
  if (r.t === "bulk")
    return r.v === null
      ? "(nil)"
      : `"${r.v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  if (r.v === null) return "(nil)";
  if (!r.v.length) return "(empty array)";
  return r.v.map((x, i) => `${i + 1}) ${renderCli(x)}`).join("\n");
}
const plain = (r: Reply): unknown =>
  r.t === "status" || r.t === "bulk" || r.t === "error"
    ? r.v
    : r.t === "int"
      ? r.v
      : r.v === null
        ? null
        : r.v.map(plain);
export function toTable(r: Reply, shape: Shape, command: string) {
  const v = plain(r);
  if (shape === "scalar")
    return { columns: ["command", "result"], rows: [[command, v]] };
  if (shape === "scan") {
    const a = (v as unknown[]) ?? [];
    return {
      columns: ["key"],
      rows: Array.isArray(a[1]) ? (a[1] as unknown[]).map((x) => [x]) : [],
    };
  }
  if (shape === "pairs") {
    const a = (v as unknown[]) ?? [];
    return {
      columns: ["field", "value"],
      rows: Array.from({ length: Math.floor(a.length / 2) }, (_, i) => [
        a[i * 2],
        a[i * 2 + 1],
      ]),
    };
  }
  if (shape === "scored") {
    const a = (v as unknown[]) ?? [];
    return {
      columns: ["member", "score"],
      rows: Array.from({ length: Math.floor(a.length / 2) }, (_, i) => [
        a[i * 2],
        Number(a[i * 2 + 1]),
      ]),
    };
  }
  if (shape === "exec") {
    if (v === null) return { columns: ["command", "result"], rows: [[command, null]] };
    const a = (v as unknown[]) ?? [];
    return { columns: ["index", "reply"], rows: a.map((x, i) => [i + 1, x]) };
  }
  if (shape === "xpending") {
    const a = (v as unknown[]) ?? [];
    const consumers = Object.fromEntries(
      ((a[3] as unknown[]) ?? []).reduce<unknown[][]>(
        (rows, item, index, all) =>
          index % 2 === 0 ? rows.concat([[item, all[index + 1]]]) : rows,
        [],
      ),
    );
    return {
      columns: ["count", "min_id", "max_id", "consumers"],
      rows: [[a[0] ?? 0, a[1] ?? null, a[2] ?? null, consumers]],
    };
  }
  if (shape === "xread") {
    const streams = (v as unknown[]) ?? [];
    const rows: unknown[][] = [];
    for (const stream of streams) {
      const pair = (stream as unknown[]) ?? [];
      const entries = (pair[1] as unknown[]) ?? [];
      for (const entry of entries) {
        const values = (entry as unknown[]) ?? [];
        const fieldList = (values[1] as unknown[]) ?? [];
        rows.push([
          pair[0] ?? null,
          values[0] ?? null,
          Object.fromEntries(
            Array.from({ length: Math.floor(fieldList.length / 2) }, (_, i) => [
              fieldList[i * 2],
              fieldList[i * 2 + 1],
            ]),
          ),
        ]);
      }
    }
    return { columns: ["stream", "id", "fields"], rows };
  }
  if (shape === "stream") {
    const entries = (v as unknown[]) ?? [];
    return {
      columns: ["id", "fields"],
      rows: entries.map((entry) => {
        const values = (entry as unknown[]) ?? [];
        const fields = (values[1] as unknown[]) ?? [];
        return [
          values[0] ?? null,
          Object.fromEntries(
            Array.from({ length: Math.floor(fields.length / 2) }, (_, i) => [
              fields[i * 2],
              fields[i * 2 + 1],
            ]),
          ),
        ];
      }),
    };
  }
  return {
    columns: ["value"],
    rows: Array.isArray(v) ? v.map((x) => [x]) : [],
  };
}
