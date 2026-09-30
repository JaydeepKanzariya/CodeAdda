import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

const MAX_ROWS = 1000;

function formatCell(v: unknown): ReactNode {
  if (v === null || v === undefined) return <span className="text-faint italic">NULL</span>;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

interface ResultTableProps {
  columns: string[];
  rows: unknown[][];
  highlight?: Set<number>;
  tone?: 'ok' | 'bad';
  label?: string;
}

export function ResultTable({ columns, rows, highlight, tone = 'ok', label = 'Query results' }: ResultTableProps) {
  const shown = rows.slice(0, MAX_ROWS);
  return (
    <div role="region" aria-label={label} tabIndex={0} className="max-h-[420px] overflow-auto rounded-md border border-line">
      <table className="w-full border-collapse font-mono text-sm">
        <thead className="sticky top-0 bg-subtle">
          <tr>
            {columns.map((c, i) => (
              <th key={i} scope="col" className="border-b border-line px-3 py-2 text-left text-xs font-semibold tracking-wide whitespace-nowrap text-muted uppercase">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row, r) => (
            <tr key={r} className={cx('border-b border-hair last:border-0', highlight?.has(r) && (tone === 'ok' ? 'bg-ok-bg' : 'bg-bad-bg'))}>
              {row.map((v, c) => (
                <td key={c} className={cx('px-3 py-1.5 whitespace-nowrap', typeof v === 'number' && 'text-right tabular-nums')}>
                  {formatCell(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > MAX_ROWS && (
        <p className="border-t border-line px-3 py-2 text-xs text-muted">
          Showing the first {MAX_ROWS} of {rows.length} rows.
        </p>
      )}
    </div>
  );
}
