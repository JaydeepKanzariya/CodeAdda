import type { LessonItem } from '@codeadda/core';
import type { Tab } from '../lab/navigation';
import { DifficultyBadge } from './DifficultyBadge';
import { Markdown } from './Markdown';

export function LessonHeader({ tab, item, number }: { tab: Tab; item: LessonItem; number: number }) {
  return (
    <header className="mb-6">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="font-mono text-xs text-faint">
          {item.chapter} · {tab === 'lessons' ? 'Lesson' : 'Problem'} {number}
        </p>
        {item.difficulty && <DifficultyBadge level={item.difficulty} />}
      </div>
      <h1 className="text-[1.875rem] leading-tight font-bold tracking-tight">{item.title}</h1>
      {item.body && <Markdown className="mt-3 max-w-[760px] text-md">{item.body}</Markdown>}
      {item.example && (
        <section className="mt-5">
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Example</h2>
          <Markdown>{item.example}</Markdown>
        </section>
      )}
    </header>
  );
}
