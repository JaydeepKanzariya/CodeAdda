import { useState } from 'react';
import { Chevron } from './Chevron';

export function SolutionPanel({ solution, onLoad }: { solution: string; onLoad: (sql: string) => void }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(solution);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-lg border border-line bg-surface">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm">
        <Chevron closed={!open} className="text-faint" />
        <span className="font-medium">Solution</span>
        <span className="ml-auto text-xs text-faint">{open ? 'hide' : 'show'}</span>
      </button>
      {open && (
        <div className="border-t border-line px-4 py-3">
          <pre className="overflow-x-auto rounded-md border border-line bg-subtle p-3 font-mono text-sm">
            <code>{solution}</code>
          </pre>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={copy} className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-hover">
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={() => onLoad(solution)}
              className="rounded-md border border-brand-line bg-brand-muted px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand-glow"
            >
              Load into editor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
