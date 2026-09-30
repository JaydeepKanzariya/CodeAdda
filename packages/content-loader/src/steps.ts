import { parse } from 'yaml';
import { z } from 'zod';
import type { StepHighlight, StepScript, StepTable } from '@codeadda/core';
import { formatZodError } from './schema';

const tone = z.enum(['focus', 'kept', 'removed']);
const cell = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const table = z
  .object({ label: z.string().optional(), columns: z.array(z.string().min(1)).min(1), rows: z.array(z.array(cell)) })
  .strict();
const highlight = z
  .object({
    table: z.string(),
    tone,
    row: z.number().int().min(1).optional(),
    column: z.string().optional(),
    cell: z.tuple([z.number().int().min(1), z.string()]).optional(),
  })
  .strict()
  .superRefine((h, ctx) => {
    const n = [h.row, h.column, h.cell].filter((x) => x !== undefined).length;
    if (n !== 1) ctx.addIssue({ code: 'custom', message: 'highlight needs exactly one of row, column or cell' });
  })
  .transform((h): StepHighlight => {
    if (h.row !== undefined) return { table: h.table, tone: h.tone, row: h.row };
    if (h.column !== undefined) return { table: h.table, tone: h.tone, column: h.column };
    return { table: h.table, tone: h.tone, cell: h.cell! };
  });
const step = z
  .object({
    label: z.string().min(1),
    caption: z.string().min(1),
    show: z.array(z.string()).optional(),
    highlight: z.array(highlight).default([]),
    dim: z.array(z.object({ table: z.string(), rows: z.array(z.number().int().min(1)) }).strict()).default([]),
    labels: z.record(z.string()).default({}),
    notes: z
      .array(
        z
          .object({ title: z.string().min(1), text: z.string().optional(), tone: z.enum(['info', 'focus', 'kept', 'removed']).default('info') })
          .strict(),
      )
      .default([]),
  })
  .strict();
const script = z
  .object({
    tables: z.record(table).refine((t) => Object.keys(t).length > 0, 'needs at least one table'),
    steps: z.array(step).min(2, 'needs at least 2 steps').max(8, 'allows at most 8 steps'),
  })
  .strict();

/** Parse and validate a "Watch it happen" YAML block. Returns the script, or an error message. */
export function parseSteps(yamlText: string): StepScript | string {
  let data: unknown;
  try {
    data = parse(yamlText);
  } catch (e) {
    return `invalid YAML: ${e instanceof Error ? e.message : String(e)}`;
  }
  const r = script.safeParse(data);
  if (!r.success) return formatZodError(r.error);
  const s = r.data;

  for (const [name, t] of Object.entries(s.tables)) {
    const bad = t.rows.findIndex((row) => row.length !== t.columns.length);
    if (bad >= 0) return `table "${name}" row ${bad + 1} has ${t.rows[bad]!.length} values but ${t.columns.length} columns`;
  }

  for (const [i, st] of s.steps.entries()) {
    const where = `step ${i + 1}`;
    const problems: string[] = [];
    const tableRef = (name: string): StepTable | undefined => {
      const t = s.tables[name];
      if (!t) problems.push(`${where}: unknown table "${name}"`);
      return t;
    };
    const rowRef = (name: string, t: StepTable, n: number) => {
      if (n > t.rows.length) problems.push(`${where}: table "${name}" has no row ${n}`);
    };
    const colRef = (name: string, t: StepTable, c: string) => {
      if (!t.columns.includes(c)) problems.push(`${where}: table "${name}" has no column "${c}"`);
    };
    st.show?.forEach(tableRef);
    Object.keys(st.labels).forEach(tableRef);
    for (const h of st.highlight) {
      const t = tableRef(h.table);
      if (!t) continue;
      if ('row' in h) rowRef(h.table, t, h.row);
      else if ('column' in h) colRef(h.table, t, h.column);
      else {
        rowRef(h.table, t, h.cell[0]);
        colRef(h.table, t, h.cell[1]);
      }
    }
    for (const d of st.dim) {
      const t = tableRef(d.table);
      if (t) d.rows.forEach((n) => rowRef(d.table, t, n));
    }
    if (problems.length) return problems[0]!;
  }
  return s as StepScript;
}
