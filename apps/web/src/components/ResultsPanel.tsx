import type { QueryResult } from '@codeadda/core';
import { ResultTable } from './ResultTable';

export function ResultsPanel({ result, running }: { result?: QueryResult; running: boolean }) {
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
  return (
    <div className="space-y-3">
      {result.notice && (
        <p role="status" className="rounded-md border border-note-line bg-note-bg px-3 py-2 text-sm text-note">
          {result.notice}
        </p>
      )}
      {result.columns.length > 0 && <ResultTable columns={result.columns} rows={result.rows} />}
      <p className="text-xs text-muted">
        {result.rowCount} {result.rowCount === 1 ? 'row' : 'rows'} · {result.durationMs} ms
      </p>
    </div>
  );
}
