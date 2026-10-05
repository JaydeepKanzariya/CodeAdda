import { use, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import type { Lab, LessonItem } from '@codeadda/core';
import { labSummaries, loadLab } from '../content/registry';
import { LabHeader } from '../components/LabHeader';
import { NotFound } from '../components/NotFound';
import { PageLoader } from '../components/PageLoader';
import { Sidebar, SIDEBAR_ID } from '../components/Sidebar';
import { SidebarToggle } from '../components/SidebarToggle';
import { prefsStore, usePrefs } from '../state/prefs';
import { useProgress } from '../state/progress';
import { LessonFlow } from './LessonFlow';
import { ProblemWorkspace } from './ProblemWorkspace';
import { flatItems, itemPath, numberOf, type Tab } from './navigation';
import { useFirstLoad } from './useFirstLoad';
import { useLabEngine } from './useLabEngine';

export function LabRoute() {
  const { labId = '' } = useParams();
  // Unknown ids never trigger a download.
  if (!labSummaries.some((s) => s.id === labId)) return <NotFound />;
  return <LoadedLab labId={labId} />;
}

function LoadedLab({ labId }: { labId: string }) {
  const { tab, itemId } = useParams();
  const lab = use(loadLab(labId)); // suspends until the lab's chunk arrives (fallback in App.tsx)
  if (!lab) return <NotFound />;

  const t: Tab = tab === 'problems' && lab.problems.length > 0 ? 'problems' : 'lessons';
  const items = flatItems(lab, t);
  const item = items.find((i) => i.id === itemId);
  if (!item || tab !== t) {
    const target = item ?? items[0];
    if (!target) {
      return (
        <div className="p-6">
          <p className="font-semibold">{lab.title} has no lessons yet.</p>
          {lab.errors.map((e) => (
            <p key={e.path} className="text-sm text-bad">
              {e.path}: {e.message}
            </p>
          ))}
        </div>
      );
    }
    return <Navigate to={itemPath(lab.id, t, target.id)} replace />;
  }
  return <LabView key={lab.id} lab={lab} tab={t} item={item} />;
}

export function LabView({ lab, tab, item }: { lab: Lab; tab: Tab; item: LessonItem }) {
  const prefs = usePrefs();
  const progress = useProgress();
  // LeetLab problems load their database only when asked (Load Database or Run Query).
  const engine = useLabEngine(lab, item, { autoLoad: tab === 'lessons' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const firstLoad = useFirstLoad(engine.status);

  // First database start on the Lessons tab: show only the loader below the navbar.
  if (tab === 'lessons' && firstLoad) {
    return (
      <div className="h-[calc(100dvh_-_var(--navbar-height))]">
        <PageLoader label="Initializing CodeAdda SQLab database…" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh_-_var(--navbar-height))] flex-col">
      <LabHeader
        lab={lab}
        tab={tab}
        onOpenDrawer={() => setDrawerOpen(true)}
        onReset={tab === 'lessons' ? () => void engine.reset() : undefined}
        resetDisabled={engine.status !== 'ready' || engine.running}
      />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar
          lab={lab}
          tab={tab}
          activeId={item.id}
          collapsed={prefs.sidebarCollapsed}
          drawerOpen={drawerOpen}
          onCloseDrawer={() => setDrawerOpen(false)}
          isComplete={(id) => progress.isComplete(lab.id, id)}
        />
        <SidebarToggle collapsed={prefs.sidebarCollapsed} onToggle={() => prefsStore.set({ sidebarCollapsed: !prefs.sidebarCollapsed })} controls={SIDEBAR_ID} />
        {tab === 'problems' ? (
          <main className="min-w-0 flex-1 overflow-hidden lab:overflow-hidden max-lab:overflow-y-auto">
            <ProblemWorkspace key={item.id} lab={lab} item={item} engine={engine} />
          </main>
        ) : (
          <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="px-4 py-6 lab:px-10 lab:py-10">
              <LessonFlow key={item.id} lab={lab} tab={tab} item={item} number={numberOf(lab, tab, item.id)} engine={engine} />
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
