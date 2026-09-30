import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { Step, StepCell, StepScript, StepTable, StepTone } from '@codeadda/core';
import { cx } from '../lib/cx';
import { Markdown } from './Markdown';

export const STEP_MS = 4500;

const CELL_TONE: Record<StepTone, string> = {
  focus: 'bg-brand-muted text-ink',
  kept: 'bg-ok-bg text-ink',
  removed: 'bg-bad-bg text-bad line-through',
};
const NOTE_TONE: Record<StepTone | 'info', string> = {
  info: 'border-note-line bg-note-bg text-note',
  focus: 'border-brand-line bg-brand-muted text-brand',
  kept: 'border-ok-line bg-ok-bg text-ok',
  removed: 'border-bad-line bg-bad-bg text-bad',
};

/** Cell highlight beats row highlight, which beats column highlight. */
function cellTone(step: Step, table: string, row: number, column: string): StepTone | undefined {
  let tone: StepTone | undefined;
  let rank = 0;
  for (const h of step.highlight) {
    if (h.table !== table) continue;
    const r =
      'cell' in h ? (h.cell[0] === row && h.cell[1] === column ? 3 : 0) : 'row' in h ? (h.row === row ? 2 : 0) : h.column === column ? 1 : 0;
    if (r > rank) {
      rank = r;
      tone = h.tone;
    }
  }
  return tone;
}

const formatCell = (v: StepCell) => (v === null ? 'NULL' : String(v));
/** Numbers, and strings that look like numbers (money is stored quoted), align right. */
const isNumeric = (v: StepCell) => typeof v === 'number' || (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v));

function StageTable({ name, table, step }: { name: string; table: StepTable; step: Step }) {
  const dimmed = new Set(step.dim.filter((d) => d.table === name).flatMap((d) => d.rows));
  return (
    <figure data-table={name} className="shrink-0">
      <figcaption className="mb-1.5 font-mono text-xs text-brand">{step.labels[name] ?? table.label ?? name}</figcaption>
      <table className="border-separate border-spacing-0 overflow-hidden rounded-md border border-line bg-surface font-mono text-xs">
        <thead>
          <tr className="bg-subtle">
            {table.columns.map((c) => (
              <th key={c} scope="col" className="px-3 py-2 text-left font-semibold tracking-wide text-muted uppercase">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className={cx('transition-opacity duration-200 motion-reduce:transition-none', dimmed.has(ri + 1) && 'opacity-35')}>
              {row.map((v, ci) => {
                const tone = cellTone(step, name, ri + 1, table.columns[ci]!);
                return (
                  <td
                    key={ci}
                    data-tone={tone}
                    className={cx(
                      'border-t border-line px-3 py-2 whitespace-nowrap transition-colors duration-200 motion-reduce:transition-none',
                      isNumeric(v) && 'text-right',
                      v === null && (tone ? 'italic' : 'text-faint italic'),
                      tone && CELL_TONE[tone],
                    )}
                  >
                    {formatCell(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function PlayIcon({ state }: { state: 'play' | 'pause' | 'replay' }) {
  if (state === 'pause') return <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" rx="1" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" /></svg>;
  if (state === 'replay') return <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M3 8a5 5 0 1 0 1.5-3.5" /><path d="M3 2.5V5h2.5" /></svg>;
  return <svg viewBox="0 0 16 16" className="ml-0.5 size-3.5" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" /></svg>;
}

export function StepPlayer({ script }: { script: StepScript }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const last = script.steps.length - 1;
  const step = script.steps[index]!;
  const visible = step.show ?? Object.keys(script.tables);
  const state = playing ? 'pause' : index === last ? 'replay' : 'play';

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (index >= last) setPlaying(false);
      else setIndex(index + 1);
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [playing, index, last]);

  const go = (i: number) => {
    setPlaying(false);
    const next = Math.max(0, Math.min(last, i));
    setIndex(next);
    // Previous/Next is about to be disabled while focused: keep focus in the player so the arrow keys still work.
    const active = document.activeElement;
    if ((next === 0 && active === prevRef.current) || (next === last && active === nextRef.current)) groupRef.current?.focus();
  };
  const toggle = () => {
    if (playing) setPlaying(false);
    else {
      if (index === last) setIndex(0);
      setPlaying(true);
    }
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    else if (e.key === ' ' && e.target === e.currentTarget) { e.preventDefault(); toggle(); }
  };

  return (
    <div
      role="group"
      ref={groupRef}
      aria-label="Watch it happen"
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="overflow-hidden rounded-xl border border-line bg-surface shadow-soft"
    >
      <div className="graph-paper min-h-[300px] overflow-x-auto p-5">
        <div className="flex items-start gap-6">
          {visible.map((name) => (
            <StageTable key={name} name={name} table={script.tables[name]!} step={step} />
          ))}
          {step.notes.length > 0 && (
            <div className="w-60 shrink-0 space-y-3">
              {step.notes.map((n, i) => (
                <div key={i} className={cx('rounded-lg border px-3.5 py-3 text-xs', NOTE_TONE[n.tone])}>
                  <p className="font-semibold">{n.title}</p>
                  {n.text && <p className="mt-1 leading-relaxed text-muted">{n.text}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div data-testid="step-caption" aria-live="polite" className="border-t border-line px-5 py-4">
        <Markdown className="text-md">{step.caption}</Markdown>
      </div>
      <div className="flex items-center gap-4 px-5 pt-2 pb-5">
        <button
          type="button"
          onClick={toggle}
          aria-label={state === 'pause' ? 'Pause' : state === 'replay' ? 'Replay' : 'Play'}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-white shadow-glow hover:bg-brand-hover"
        >
          <PlayIcon state={state} />
        </button>
        <ol className="flex min-w-0 flex-1 gap-2">
          {script.steps.map((s, i) => (
            <li key={i} className="min-w-0 flex-1">
              <button type="button" onClick={() => go(i)} aria-current={i === index ? 'step' : undefined} className="block w-full text-left">
                <span className="relative block h-0.5 overflow-hidden rounded bg-line-strong">
                  {i < index && <span className="absolute inset-0 bg-brand" />}
                  {i === index && (
                    <span
                      key={`${index}-${playing}`}
                      className={cx('absolute inset-0 bg-brand', playing && 'step-fill')}
                      style={{ '--step-ms': `${STEP_MS}ms` } as CSSProperties}
                    />
                  )}
                </span>
                <span className={cx('mt-2 block truncate text-xs', i === index ? 'font-medium text-ink' : 'text-faint')}>{s.label}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="flex shrink-0 gap-1.5">
          <button ref={prevRef} type="button" aria-label="Previous step" disabled={index === 0} onClick={() => go(index - 1)} className="grid size-8 place-items-center rounded-md border border-line text-muted hover:bg-hover disabled:opacity-40">
            ‹
          </button>
          <button ref={nextRef} type="button" aria-label="Next step" disabled={index === last} onClick={() => go(index + 1)} className="grid size-8 place-items-center rounded-md border border-line text-muted hover:bg-hover disabled:opacity-40">
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
