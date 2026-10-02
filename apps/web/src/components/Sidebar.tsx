import { Fragment, useState } from 'react';
import { Link } from 'react-router';
import type { ContentError, Lab } from '@codeadda/core';
import { cx } from '../lib/cx';
import { useIsDesktop } from '../lib/useIsDesktop';
import { chaptersFor, itemPath, levelStarts, type Tab } from '../lab/navigation';
import { Chevron } from './Chevron';

export interface SidebarProps {
  lab: Lab;
  tab: Tab;
  activeId: string;
  collapsed: boolean;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
  isComplete: (itemId: string) => boolean;
}

export const SIDEBAR_ID = 'lab-sidebar';

const DOT = { Easy: 'bg-ok', Medium: 'bg-warn', Hard: 'bg-bad' } as const;

// Level 1/2/3 dots: green, amber, red; any further level uses the brand colour.
const LEVEL_DOT = ['bg-ok', 'bg-warn', 'bg-bad'];

function ContentErrors({ errors }: { errors: ContentError[] }) {
  return (
    <div role="alert" className="m-3 rounded-md border border-bad-line bg-bad-bg p-3 text-xs text-bad">
      <p className="font-semibold">Some content files have problems</p>
      <ul className="mt-1 space-y-1">
        {errors.map((e) => (
          <li key={`${e.path}:${e.message}`}>
            <code className="font-mono">{e.path}</code>: {e.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sidebar({ lab, tab, activeId, collapsed, drawerOpen, onCloseDrawer, isComplete }: SidebarProps) {
  const chapters = chaptersFor(lab, tab);
  const levelAt = new Map(tab === 'lessons' ? levelStarts(lab).map((l) => [l.chapter, l]) : []);
  const activeChapter = chapters.find((ch) => ch.items.some((it) => it.id === activeId))?.title;
  // Lessons: only the chapter holding the active lesson starts open; problems: every group starts open.
  // `toggled` holds explicit open/closed state (user clicks and auto-opens) for the session.
  const [toggled, setToggled] = useState<Record<string, boolean>>(() => (activeChapter ? { [activeChapter]: true } : {}));
  const [seenActive, setSeenActive] = useState(activeId);
  if (seenActive !== activeId) {
    setSeenActive(activeId);
    if (activeChapter && !toggled[activeChapter]) setToggled((o) => ({ ...o, [activeChapter]: true }));
  }
  const isDesktop = useIsDesktop();
  // Below 900px the closed drawer is only translated off-screen: keep it out of the tab order and AT.
  const hiddenDrawer = !isDesktop && !drawerOpen;
  // Collapsed on desktop the sidebar takes no width and leaves the accessibility tree.
  const collapsedOnDesktop = isDesktop && collapsed;

  const heading =
    tab === 'lessons'
      ? { title: lab.sidebarTitle ?? lab.title, subtitle: lab.sidebarSubtitle ?? lab.subtitle }
      : { title: 'Challenges', subtitle: 'Original SQL challenges, easy to hard' };

  let counter = 0;

  return (
    <>
      {drawerOpen && <div className="fixed inset-0 z-[1500] bg-backdrop lab:hidden" onClick={onCloseDrawer} aria-hidden="true" />}
      <aside
        aria-label="Lesson list"
        id={SIDEBAR_ID}
        inert={hiddenDrawer || collapsedOnDesktop}
        className={cx(
          'fixed inset-y-0 left-0 z-[1600] flex w-(--sidebar-width) flex-col border-r border-line bg-surface transition-transform duration-200',
          'lab:relative lab:z-auto lab:translate-x-0',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
          'lab:border-r-0',
          collapsed && 'lab:hidden',
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-start gap-2 border-b border-line px-4 py-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold">{heading.title}</h2>
              {heading.subtitle && <p className="text-xs text-muted">{heading.subtitle}</p>}
            </div>
            <button type="button" onClick={onCloseDrawer} aria-label="Close lesson list" className="rounded-md px-2 py-1 text-muted hover:bg-hover lab:hidden">
              ✕
            </button>
          </div>
          <nav aria-label="Chapters" className="min-h-0 flex-1 overflow-y-auto py-2">
            <div className="fs-list">
            {chapters.map((ch) => {
              const isOpen = toggled[ch.title] ?? tab === 'problems';
              const start = counter;
              counter += ch.items.length;
              const level = levelAt.get(ch.title);
              return (
                <Fragment key={ch.title}>
                  {level && (
                    <h3 className="flex items-center gap-2 px-4 pt-5 pb-0.5 text-xs font-semibold tracking-wider text-muted uppercase">
                      <span aria-hidden="true" className={cx('size-2 rounded-full', LEVEL_DOT[level.index] ?? 'bg-brand')} />
                      {level.title}
                    </h3>
                  )}
                  <section>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setToggled((o) => ({ ...o, [ch.title]: !isOpen }))}
                      className="flex w-full items-center gap-2 px-4 pt-4 pb-1.5 text-left text-[0.6875rem] font-semibold tracking-wider text-faint uppercase hover:text-ink"
                    >
                      <Chevron closed={!isOpen} className="size-2.5" />
                      {ch.title}
                    </button>
                    {isOpen && (
                      <ul>
                        {ch.items.map((it, idx) => {
                          const active = it.id === activeId;
                          return (
                            <li key={it.id}>
                              <Link
                                to={itemPath(lab.id, tab, it.id)}
                                onClick={onCloseDrawer}
                                aria-current={active ? 'page' : undefined}
                                className={cx(
                                  'mx-2 flex gap-3 rounded-md px-2.5 py-2 text-sm transition-colors',
                                  tab === 'problems' ? 'items-start' : 'items-center',
                                  active ? 'bg-brand-muted font-medium text-ink' : 'text-ink hover:bg-hover',
                                )}
                              >
                                {isComplete(it.id) ? (
                                  <span aria-label="completed" className="grid size-5 shrink-0 place-items-center rounded-full bg-ok-bg text-[0.625rem] font-bold text-ok">✓</span>
                                ) : tab === 'problems' && it.difficulty ? (
                                  <span aria-label={it.difficulty} className={cx('mt-1.5 size-1.5 shrink-0 self-start rounded-full', DOT[it.difficulty])} />
                                ) : (
                                  <span
                                    data-badge
                                    className={cx(
                                      'grid size-5 shrink-0 place-items-center rounded-full font-mono text-[0.625rem]',
                                      active ? 'bg-brand text-white' : 'bg-subtle text-muted',
                                    )}
                                  >
                                    {start + idx + 1}
                                  </span>
                                )}
                                <span className={cx('min-w-0 flex-1', tab === 'problems' ? 'leading-snug' : 'truncate')}>{it.title}</span>
                                {it.steps && <span aria-label="has animation" className="text-[0.5rem] text-brand">▶</span>}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                </Fragment>
              );
            })}
            {lab.errors.length > 0 && <ContentErrors errors={lab.errors} />}
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}
