import { useState } from 'react';
import type { QueryResult } from '@codeadda/core';
import { cx } from '../lib/cx';
import { ResultTable } from './ResultTable';

export function ResultsPanel({
  result,
  running,
  altView,
  resultUnit,
}: {
  result?: QueryResult;
  running: boolean;
  altView?: string;
  resultUnit?: 'row' | 'document';
}) {
  const [view, setView] = useState<'table' | 'alternate'>('table');

  if (running) return <p className="text-sm text-muted">Running…</p>;
  if (!result) return <p className="py-10 text-center text-sm text-faint">Run a query to see results</p>;
  if (!result.ok) {
    return (
      <div role="alert" className="rounded-md border border-bad-line bg-bad-bg p-3 text-sm text-bad">
        <p className="font-semibold">Error{result.error.code ? ` ${result.error.code}` : ''}</p>
        <pre className="mt-1 font-mono whitespace-pre-wrap">{result.error.message}</pre>
        {result.error.position !== undefined && <p className="mt-1 text-xs">At character {result.error.position}</p>}
      </div>
    );
  }

  const documents = result.documents;
  const alternate = altView ?? (documents !== undefined ? 'Documents' : undefined);
  const hasAlternate = alternate !== undefined && documents !== undefined;
  const unit = resultUnit
    ? result.rowCount === 1 ? resultUnit : `${resultUnit}s`
    : documents
      ? result.rowCount === 1 ? 'document' : 'documents'
      : result.rowCount === 1 ? 'row' : 'rows';

  return (
    <div className="space-y-3">
      {result.notice && (
        <p role="status" className="rounded-md border border-note-line bg-note-bg px-3 py-2 text-sm text-note">
          {result.notice}
        </p>
      )}
      {hasAlternate && (
        <div className="flex items-center justify-between">
          <div role="radiogroup" aria-label="Results view" className="inline-flex rounded-md border border-line bg-subtle p-0.5 text-xs font-medium">
            <button
              type="button"
              role="radio"
              aria-checked={view === 'table'}
              onClick={() => setView('table')}
              className={cx(
                'rounded px-2.5 py-1 transition-colors',
                view === 'table' ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:text-ink',
              )}
            >
              Table
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={view === 'alternate'}
              onClick={() => setView('alternate')}
              className={cx(
                'rounded px-2.5 py-1 transition-colors',
                view === 'alternate' ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:text-ink',
              )}
            >
              {alternate}
            </button>
          </div>
        </div>
      )}
      {view === 'alternate' && documents ? (
        <div className="max-h-[420px] space-y-2 overflow-auto">
          {documents.length === 0 ? (
            <p className="py-6 text-center text-sm text-faint">0 documents</p>
          ) : (
            documents.map((doc, idx) => (
              <pre key={idx} className="rounded-md border border-line bg-page p-3 font-mono text-sm whitespace-pre-wrap">
                {typeof doc === 'string' ? doc : JSON.stringify(doc, null, 2)}
              </pre>
            ))
          )}
        </div>
      ) : (
        result.columns.length > 0 && <ResultTable columns={result.columns} rows={result.rows} />
      )}
      <p className="text-xs text-muted">
        {result.rowCount} {unit} · {result.durationMs} ms
      </p>
    </div>
  );
}
