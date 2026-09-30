import { useId, useState } from 'react';
import type { Difficulty, LessonItem } from '@codeadda/core';
import type { LabEngine } from '../lab/useLabEngine';
import { cx } from '../lib/cx';
import { Markdown } from './Markdown';

const TONE: Record<Difficulty, string> = {
  Easy: 'bg-ok-bg text-ok',
  Medium: 'bg-warn-bg text-warn',
  Hard: 'bg-bad-bg text-bad',
};

const BUTTON = 'shrink-0 rounded-md border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors';

/**
 * Splits the raw `## Tables` markdown into the first fenced block (shown verbatim in a <pre>)
 * and the prose around it. Without a fence, the whole section is the block.
 */
export function splitTables(raw: string): { before: string; block: string; after: string } {
  const m = /^[ \t]*(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n?[ \t]*\1[ \t]*$/m.exec(raw);
  if (!m) return { before: '', block: raw.trim(), after: '' };
  return {
    before: raw.slice(0, m.index).trim(),
    block: m[2].replace(/\s+$/, ''),
    after: raw.slice(m.index + m[0].length).trim(),
  };
}

/** The example's fenced block in plain monospace (no inner box), with any prose around it as Markdown. */
function ExampleBody({ raw }: { raw: string }) {
  const { before, block, after } = splitTables(raw);
  return (
    <div className="space-y-3">
      {before && <Markdown className="text-sm">{before}</Markdown>}
      <pre data-example className="overflow-x-auto font-mono text-sm leading-relaxed text-ink">
        {block}
      </pre>
      {after && <Markdown className="text-sm">{after}</Markdown>}
    </div>
  );
}

function LoadButton({ engine }: { engine: LabEngine }) {
  if (engine.status === 'ready') {
    return (
      <button type="button" disabled className={cx(BUTTON, 'border-ok-line bg-ok-bg text-ok')}>
        Database Loaded
      </button>
    );
  }
  const loading = engine.status === 'loading';
  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => (engine.status === 'error' ? engine.retry() : void engine.load())}
      className={cx(BUTTON, 'border-brand-line bg-brand-muted text-brand hover:bg-brand-muted/70 disabled:opacity-70')}
    >
      {loading ? 'Loading…' : 'Load Database'}
    </button>
  );
}

export function ProblemPane({ item, engine }: { item: LessonItem; engine: LabEngine }) {
  const [hintOpen, setHintOpen] = useState(false);
  const titleId = useId();
  const tables = item.tables?.trim() ? splitTables(item.tables) : undefined;
  const hasHints = item.hints.length > 0;

  return (
    <section aria-labelledby={titleId} className="flex h-full flex-col overflow-hidden rounded-none bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
        <h1 id={titleId} className="text-xl font-semibold">
          {item.title}
        </h1>
        {item.difficulty && (
          <span className={cx('rounded-full px-2 py-0.5 text-[0.625rem] font-bold tracking-wider uppercase', TONE[item.difficulty])}>
            {item.difficulty}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <LoadButton engine={engine} />
          {hasHints && (
            <button
              type="button"
              aria-expanded={hintOpen}
              onClick={() => setHintOpen((o) => !o)}
              className={cx(BUTTON, 'border-line bg-surface text-ink hover:bg-hover')}
            >
              {hintOpen ? 'Hide Hint' : 'Show Hint'}
            </button>
          )}
        </div>
      </div>

      <div className="fs-content min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <Markdown className="text-md">{item.body}</Markdown>

        {tables && (
          <div className="space-y-3">
            {tables.before && <Markdown className="text-md">{tables.before}</Markdown>}
            <div className="overflow-x-auto rounded-md border border-line bg-subtle p-4 font-mono text-sm leading-relaxed">
              <pre data-tables>{tables.block}</pre>
              {tables.after && <p className="mt-4 whitespace-pre-line text-ink">{tables.after}</p>}
            </div>
          </div>
        )}

        <div data-task className="rounded-r-lg border-l-[3px] border-brand bg-subtle px-5 py-4">
          <Markdown className="text-md [&_p]:text-ink [&_p:first-child>strong:first-child]:font-bold [&_p:first-child>strong:first-child]:text-ink">{`**Task:** ${item.task}`}</Markdown>
        </div>

        {item.example?.trim() && (
          <details open className="rounded-md border border-line bg-subtle">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Example</summary>
            <div className="px-4 pb-4">
              <ExampleBody raw={item.example} />
            </div>
          </details>
        )}

        {hasHints && hintOpen && (
          <div className="flex gap-1.5 rounded-md border border-dashed border-line-strong px-4 py-3 text-sm">
            <strong className="shrink-0">Hint:</strong>
            <div className="min-w-0 space-y-2">
              {item.hints.map((h, i) => (
                <Markdown key={i}>{h}</Markdown>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
