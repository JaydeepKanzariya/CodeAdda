import { Link } from 'react-router';
import type { Lab } from '@codeadda/core';
import { cx } from '../lib/cx';
import { flatItems, itemPath, type Tab } from '../lab/navigation';

const LABELS: Record<Tab, string> = { lessons: 'Lessons', problems: 'LeetLab' };

export function ModeTabs({ lab, tab }: { lab: Lab; tab: Tab }) {
  const tabs = (['lessons', 'problems'] as const).flatMap((id) => {
    const first = flatItems(lab, id)[0];
    return first ? [{ id, first }] : [];
  });
  if (tabs.length < 2) return null;
  return (
    <div role="tablist" aria-label="Lab mode" className="order-last flex basis-full rounded-lg border border-line bg-subtle p-1 sm:order-none sm:basis-auto lab:justify-self-center">
      {tabs.map((t) => (
        <Link
          key={t.id}
          role="tab"
          aria-selected={tab === t.id}
          to={itemPath(lab.id, t.id, t.first.id)}
          className={cx(
            'flex-1 rounded-md px-4 py-1 text-center text-sm font-medium transition-colors sm:flex-none',
            tab === t.id ? 'border border-line bg-surface text-ink shadow-soft' : 'border border-transparent text-muted hover:text-ink',
          )}
        >
          {LABELS[t.id]}
        </Link>
      ))}
    </div>
  );
}
