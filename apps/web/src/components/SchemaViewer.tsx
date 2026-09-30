import { useState } from 'react';
import type { SchemaInfo, TableInfo } from '@codeadda/core';
import { cx } from '../lib/cx';

function Badge({ children, tone }: { children: string; tone: 'pk' | 'fk' }) {
  return (
    <span
      className={cx(
        'ml-1.5 rounded border px-1.5 py-0.5 font-sans text-[0.625rem] font-semibold',
        tone === 'pk' ? 'border-warn-line bg-warn-bg text-warn' : 'border-note-line bg-note-bg text-note',
      )}
    >
      {children}
    </span>
  );
}

interface SchemaViewerProps {
  schema?: SchemaInfo;
  onSample: (t: TableInfo) => void;
  disabled?: boolean;
  /** Shown instead of "Loading schema…" while there is no schema (e.g. the database is not loaded yet). */
  placeholder?: { subtitle: string; message: string };
  /** Fill a pane: no outer card border/radius and no inner scroll; the parent scrolls. */
  flush?: boolean;
}

export function SchemaViewer({ schema, onSample, disabled = false, placeholder, flush = false }: SchemaViewerProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  if (!schema && placeholder) {
    return (
      <div className="flex h-full min-h-48 flex-col">
        <div className="border-b border-line px-5 py-4">
          <h3 className="text-base font-semibold">Database Schema</h3>
          <p className="text-xs text-faint">{placeholder.subtitle}</p>
        </div>
        <div className="grid flex-1 place-items-center px-6 py-10 text-center text-sm text-muted">
          <p>{placeholder.message}</p>
        </div>
      </div>
    );
  }
  if (!schema) return <p className="text-sm text-muted">Loading schema…</p>;
  if (schema.tables.length === 0) return <p className="text-sm text-muted">There are no tables yet.</p>;

  return (
    <div data-schema-viewer className={flush ? 'bg-surface' : 'overflow-hidden rounded-xl border border-line bg-surface'}>
      <div className="border-b border-line px-5 py-4">
        <h3 className="text-base font-semibold">Database Schema</h3>
        <p className="text-xs text-faint">Explore the tables and their structure</p>
      </div>
      <div data-schema-body className={cx('space-y-3 p-4', flush ? 'bg-surface' : 'max-h-[420px] overflow-y-auto bg-page')}>
        {schema.tables.map((t, idx) => {
          const isOpen = open[t.name] ?? idx === 0;
          return (
            <section key={t.name} className="overflow-hidden rounded-lg border border-line bg-page">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen((o) => ({ ...o, [t.name]: !isOpen }))}
                className={cx('flex w-full items-start gap-3 px-4 py-3 text-left', isOpen && 'bg-subtle')}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm font-semibold">{t.name}</span>
                  {t.description && <span className="block text-xs text-muted">{t.description}</span>}
                  <span className="mt-1.5 block text-[0.6875rem] text-faint">{t.rowCount} {t.rowCount === 1 ? 'row' : 'rows'}</span>
                </span>
                <span aria-hidden="true" className="self-center text-[0.625rem] text-faint">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="border-t border-line px-4 py-3">
                  <p className="mb-2 text-[0.6875rem] font-semibold tracking-wider text-faint uppercase">Columns</p>
                  <div className="overflow-x-auto rounded-md border border-line">
                    <table className="w-full text-sm">
                      <thead className="bg-subtle">
                        <tr className="text-left text-[0.6875rem] tracking-wider text-muted uppercase">
                          <th className="px-3 py-2 font-semibold">Name</th>
                          <th className="px-3 py-2 font-semibold">Type</th>
                          <th className="px-3 py-2 font-semibold">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.columns.map((c) => (
                          <tr key={c.name} className="border-t border-line">
                            <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">
                              {c.name}
                              {c.isPrimary && <Badge tone="pk">PK</Badge>}
                              {c.isForeign && <Badge tone="fk">FK</Badge>}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs whitespace-nowrap text-muted">{c.displayType ?? c.type.toUpperCase()}</td>
                            <td className="px-3 py-2 text-muted">{c.description ?? ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onSample(t)}
                      disabled={disabled}
                      className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-soft hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      View Sample Data
                    </button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
        {schema.relationships.length > 0 && (
          <div className="rounded-lg border border-line bg-subtle p-4">
            <p className="mb-2 text-[0.6875rem] font-semibold tracking-wider text-faint uppercase">Table relationships</p>
            <ul className="space-y-2">
              {schema.relationships.map((r) => (
                <li key={`${r.from}.${r.column}`} className="rounded-md border-l-[3px] border-brand bg-surface px-3 py-2.5">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <code className="rounded border border-line bg-subtle px-1.5 py-0.5 font-mono text-xs font-semibold">{r.from}</code>
                    <span aria-hidden="true" className="text-brand">→</span>
                    <code className="rounded border border-line bg-subtle px-1.5 py-0.5 font-mono text-xs font-semibold">{r.to}</code>
                    <span className="text-xs text-faint">({r.kind})</span>
                  </p>
                  {r.description && <p className="mt-1.5 text-sm text-muted">{r.description}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
