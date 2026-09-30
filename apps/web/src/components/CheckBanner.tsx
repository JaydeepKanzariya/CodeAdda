import { useState } from 'react';
import { markRows, type CheckResult } from '@codeadda/core';
import { ResultTable } from './ResultTable';

export function CheckBanner({ check }: { check: CheckResult }) {
  const [showDiff, setShowDiff] = useState(false);

  if (check.pass) {
    return (
      <div role="status" className="rounded-md border border-ok-line bg-ok-bg px-4 py-3 text-sm text-ok">
        <strong>Correct!</strong> {check.reason}
      </div>
    );
  }

  const { expected, actual } = check;
  return (
    <div className="space-y-3">
      <div role="status" className="rounded-md border border-warn-line bg-warn-bg px-4 py-3 text-sm text-warn">
        <p>
          <strong>Not quite.</strong> {check.reason}
        </p>
        {expected && actual && (
          <button type="button" aria-expanded={showDiff} onClick={() => setShowDiff((s) => !s)} className="mt-2 text-xs font-semibold underline">
            {showDiff ? 'Hide difference' : 'Show difference'}
          </button>
        )}
      </div>
      {showDiff && expected && actual && (
        <div className="grid gap-4 lab:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Expected</h3>
            <ResultTable label="Expected result" columns={expected.columns} rows={expected.rows} highlight={markRows(expected.rows, check.missing)} tone="ok" />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Your result</h3>
            <ResultTable label="Your result" columns={actual.columns} rows={actual.rows} highlight={markRows(actual.rows, check.extra)} tone="bad" />
          </div>
        </div>
      )}
    </div>
  );
}
