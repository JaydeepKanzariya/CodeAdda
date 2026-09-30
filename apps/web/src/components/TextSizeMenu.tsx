import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { cx } from '../lib/cx';
import type { Tab } from '../lab/navigation';
import { TEXT_AREAS, TEXT_MAX, TEXT_MIN, TEXT_PRESETS, TEXT_STEP, presetOf, prefsStore, usePrefs, type TextArea, type TextPreset } from '../state/prefs';

const PRESET_NAMES = Object.keys(TEXT_PRESETS) as TextPreset[];

function labelOf(area: TextArea, tab: Tab): string {
  switch (area) {
    case 'list':
      return 'Lesson list';
    case 'content':
      return tab === 'problems' ? 'Problem' : 'Lesson';
    case 'schema':
      return 'Schema browser';
    case 'editor':
      return 'Code editor';
    case 'results':
      return 'Query results';
  }
}

export function TextSizeMenu({ tab }: { tab: Tab }) {
  const sizes = usePrefs().textSizes;
  const current = presetOf(sizes);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label="Text size settings"
        ref={triggerRef}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cx(
          'grid size-9 place-items-center rounded-md border text-sm font-semibold shadow-soft',
          open ? 'border-brand-line bg-brand-muted text-brand' : 'border-line bg-surface text-ink hover:bg-hover',
        )}
      >
        <span aria-hidden="true">
          A<sup className="text-[0.6em]">A</sup>
        </span>
      </button>
      {open && (
        <div id={dialogId} role="dialog" aria-label="Text size" className="absolute right-0 z-[2000] mt-2 w-[270px] rounded-xl border border-line bg-surface p-4 shadow-float">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Text size</p>
            <button type="button" onClick={prefsStore.resetText} className="text-xs text-faint hover:text-ink">
              Reset
            </button>
          </div>
          <div role="group" aria-label="Presets" className="mt-3 grid grid-cols-4 gap-1 rounded-lg border border-line bg-subtle p-1">
            {PRESET_NAMES.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={current === p}
                onClick={() => prefsStore.setPreset(p)}
                className={cx(
                  'rounded-md py-1 text-xs font-medium',
                  current === p ? 'border border-line bg-surface text-ink shadow-soft' : 'border border-transparent text-faint hover:text-ink',
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {TEXT_AREAS.map((area) => {
              const label = labelOf(area, tab);
              const pct = Math.round(sizes[area] * 100);
              return (
                <label key={area} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 truncate">{label}</span>
                  <input
                    type="range"
                    min={TEXT_MIN * 100}
                    max={TEXT_MAX * 100}
                    step={TEXT_STEP * 100}
                    value={pct}
                    onChange={(e) => prefsStore.setTextSize(area, Number(e.target.value) / 100)}
                    className="size-slider min-w-0 flex-1"
                    style={{ '--fill': `${((sizes[area] - TEXT_MIN) / (TEXT_MAX - TEXT_MIN)) * 100}%` } as CSSProperties}
                    aria-label={label}
                    aria-valuetext={`${pct}%`}
                  />
                  <span className="w-10 text-right text-xs text-faint tabular-nums">{pct}%</span>
                </label>
              );
            })}
          </div>
          <p className="mt-4 border-t border-line pt-3 text-[0.6875rem] text-faint">Saved on this device · default 100%</p>
        </div>
      )}
    </div>
  );
}
