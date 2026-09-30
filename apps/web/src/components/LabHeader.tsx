import type { Lab } from '@codeadda/core';
import type { Tab } from '../lab/navigation';
import { TextSizeMenu } from './TextSizeMenu';
import { ModeTabs } from './ModeTabs';

/** "SQL Lab" → "CodeAdda " + orange "SQL" + "ab" (the shared L reads as "SQLab"); other titles keep " Lab". */
function Wordmark({ title }: { title: string }) {
  const [head = '', ...rest] = title.split(' ');
  const tail = rest.join(' ');
  const merged = tail === 'Lab' && head.endsWith('L');
  return (
    <>
      CodeAdda <span className="text-brand">{head}</span>
      {tail && (merged ? 'ab' : ` ${tail}`)}
    </>
  );
}

interface LabHeaderProps {
  lab: Lab;
  tab: Tab;
  onOpenDrawer: () => void;
  onReset?: () => void;
  resetDisabled?: boolean;
}

export function LabHeader({ lab, tab, onOpenDrawer, onReset, resetDisabled }: LabHeaderProps) {
  const subtitle = tab === 'problems' ? lab.problemsSubtitle ?? lab.subtitle : lab.subtitle;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-4 py-2.5 lab:grid lab:grid-cols-[1fr_auto_1fr] lab:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onOpenDrawer} aria-label="Open lesson list" className="rounded-md border border-line px-2.5 py-1.5 text-sm text-muted hover:bg-hover lab:hidden">
          ☰
        </button>
        <p className="shrink-0 text-md font-semibold">
          <Wordmark title={lab.title} />
        </p>
        {subtitle && <p className="hidden truncate text-sm text-muted md:block">{subtitle}</p>}
      </div>
      <ModeTabs lab={lab} tab={tab} />
      <div className="ml-auto flex items-center gap-2 lab:justify-self-end">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={resetDisabled}
            title="Reset the practice database"
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-soft hover:bg-hover disabled:opacity-50"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M3 8a5 5 0 1 0 1.5-3.5" />
              <path d="M3 2.5V5h2.5" />
            </svg>
            Reset DB
          </button>
        )}
        <TextSizeMenu tab={tab} />
      </div>
    </div>
  );
}
