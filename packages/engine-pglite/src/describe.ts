import type { PGlite } from '@electric-sql/pglite';
import type { ColumnInfo, Relationship, SchemaInfo, TableInfo } from '@codeadda/core';

const TABLES_SQL = `
  SELECT c.relname AS name, obj_description(c.oid, 'pg_class') AS description
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY c.oid`;

const COLUMNS_SQL = `
  SELECT c.relname AS table_name, a.attname AS name,
         format_type(a.atttypid, a.atttypmod) AS type, NOT a.attnotnull AS nullable,
         col_description(a.attrelid, a.attnum) AS description,
         COALESCE(pg_get_expr(d.adbin, d.adrelid) LIKE 'nextval(%', false) AS serial
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
  ORDER BY c.relname, a.attnum`;

const KEYS_SQL = `
  SELECT con.contype AS kind, c.relname AS table_name, a.attname AS column_name,
         fc.relname AS ref_table, fa.attname AS ref_column,
         obj_description(con.oid, 'pg_constraint') AS description
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
  JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum
  LEFT JOIN pg_class fc ON fc.oid = con.confrelid
  LEFT JOIN pg_attribute fa ON fa.attrelid = con.confrelid AND fa.attnum = con.confkey[k.ord]
  WHERE n.nspname = 'public' AND con.contype IN ('p', 'f')
  ORDER BY c.relname, con.conname, k.ord`;

interface KeyRow { kind: string; table_name: string; column_name: string; ref_table: string | null; ref_column: string | null; description: string | null }
interface ColumnRow { table_name: string; name: string; type: string; nullable: boolean; description: string | null; serial: boolean }

export function displayType(type: string, serial: boolean): string {
  if (serial && type === 'integer') return 'SERIAL';
  if (serial && type === 'bigint') return 'BIGSERIAL';
  return type
    .replace(/^character varying/, 'varchar')
    .replace(/^character\b/, 'char')
    .replace(/^numeric/, 'decimal')
    .replace(/^timestamp with time zone/, 'timestamptz')
    .replace(/^timestamp without time zone/, 'timestamp')
    .toUpperCase();
}

export function quoteIdent(name: string): string {
  return /^[a-z_][a-z0-9_]*$/.test(name) ? name : `"${name.replace(/"/g, '""')}"`;
}

export async function describeSchema(db: PGlite): Promise<SchemaInfo> {
  const tables = (await db.query<{ name: string; description: string | null }>(TABLES_SQL)).rows;
  const columns = (await db.query<ColumnRow>(COLUMNS_SQL)).rows;
  const keys = (await db.query<KeyRow>(KEYS_SQL)).rows;

  const result: TableInfo[] = [];
  for (const t of tables) {
    const count = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${quoteIdent(t.name)}`);
    const cols: ColumnInfo[] = columns
      .filter((c) => c.table_name === t.name)
      .map((c) => {
        const fk = keys.find((k) => k.kind === 'f' && k.table_name === t.name && k.column_name === c.name);
        return {
          name: c.name,
          type: c.type,
          nullable: c.nullable,
          description: c.description ?? undefined,
          displayType: displayType(c.type, c.serial),
          isPrimary: keys.some((k) => k.kind === 'p' && k.table_name === t.name && k.column_name === c.name),
          isForeign: !!fk,
          references: fk ? `${fk.ref_table}(${fk.ref_column})` : undefined,
        };
      });
    result.push({
      name: t.name,
      description: t.description ?? undefined,
      rowCount: count.rows[0]?.n ?? 0,
      columns: cols,
      sampleQuery: `SELECT * FROM ${quoteIdent(t.name)} LIMIT 5;`,
    });
  }

  const relationships: Relationship[] = keys
    .filter((k) => k.kind === 'f')
    .map((k) => ({
      from: k.table_name,
      column: k.column_name,
      to: k.ref_table ?? '',
      toColumn: k.ref_column ?? '',
      kind: k.ref_table === k.table_name ? ('self-reference' as const) : ('many-to-one' as const),
      description: k.description ?? undefined,
    }));

  return { tables: result, relationships };
}
