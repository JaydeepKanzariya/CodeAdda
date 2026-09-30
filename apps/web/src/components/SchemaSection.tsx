import { useState, type ReactNode } from 'react';
import { Chevron } from './Chevron';

export function SchemaSection({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="space-y-3 pt-6">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink shadow-soft hover:bg-hover"
      >
        <Chevron closed={!open} />
        Database schema
      </button>
      {open && children}
    </section>
  );
}
