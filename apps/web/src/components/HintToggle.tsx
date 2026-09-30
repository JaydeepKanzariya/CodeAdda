import { useState } from 'react';
import { Markdown } from './Markdown';

export function HintToggle({ hints }: { hints: string[] }) {
  const [open, setOpen] = useState(false);
  if (hints.length === 0) return null;
  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-soft hover:bg-hover"
      >
        {open ? 'Hide hint' : 'Show hint'}
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-md border border-line bg-surface px-4 py-3 text-sm">
          {hints.map((h, i) => (
            <Markdown key={i}>{h}</Markdown>
          ))}
        </div>
      )}
    </div>
  );
}
