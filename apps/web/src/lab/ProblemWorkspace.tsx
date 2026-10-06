import { useState, type ReactNode } from 'react';
import { Group, Panel, useDefaultLayout, type LayoutStorage } from 'react-resizable-panels';
import type { Lab, LessonItem, TableInfo } from '@codeadda/core';
import { CheckBanner } from '../components/CheckBanner';
import { ErrorScreen } from '../components/ErrorScreen';
import { ProblemPane } from '../components/ProblemPane';
import { QueryEditor } from '../components/QueryEditor';
import { ResizeHandle } from '../components/ResizeHandle';
import { ResultsPanel } from '../components/ResultsPanel';
import { SchemaViewer } from '../components/SchemaViewer';
import { cx } from '../lib/cx';
import { useIsDesktop } from '../lib/useIsDesktop';
import { usePrefs } from '../state/prefs';
import { progressStore } from '../state/progress';
import { useDraftSaver } from './useDraftSaver';
import { type LabEngine } from './useLabEngine';
import { labUi } from './labUi';

type OutputTab = 'results' | 'schema';

const SCHEMA_PLACEHOLDER = {
  subtitle: 'Load the challenge database to view its schema',
  message: 'Press "Load Database" to create this challenge\'s tables and see their structure.',
};

const SCHEMA_ERROR = {
  subtitle: 'The challenge database could not be loaded',
  message: "Couldn't load the challenge database — use the button above to retry.",
};

const MIN = '15%';
/** Pixel floor for each column so the editor header (and Run Query) can never be clipped. */
const COL_MIN = '320px';
const CARD = 'h-full overflow-hidden rounded-xl border border-line bg-surface';

/** A saved layout react-resizable-panels can read: a plain object of finite numbers. */
function isSavedLayout(raw: string): boolean {
  try {
    const v: unknown = JSON.parse(raw);
    return (
      typeof v === 'object' &&
      v !== null &&
      !Array.isArray(v) &&
      Object.values(v).every((n) => typeof n === 'number' && Number.isFinite(n))
    );
  } catch {
    return false;
  }
}

/**
 * localStorage that never throws (private windows, blocked site data): sizes just are not kept.
 * useDefaultLayout JSON.parses what getItem returns without a guard, so anything that is not a
 * valid saved layout (bad JSON, "null", an array, ...) is removed and reported as missing.
 */
const safeStorage: LayoutStorage = {
  getItem(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || isSavedLayout(raw)) return raw;
      localStorage.removeItem(key);
      return null;
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* not saved */
    }
  },
};

function useSavedLayout(id: string) {
  return useDefaultLayout({ id, storage: safeStorage, onlySaveAfterUserInteractions: true });
}

interface Props {
  lab: Lab;
  item: LessonItem;
  engine: LabEngine;
}

export function ProblemWorkspace({ lab, item, engine }: Props) {
  const prefs = usePrefs();
  const isDesktop = useIsDesktop();
  const ui = labUi(lab.language);
  const [query, setQuery] = useState(() => progressStore.getDraft(lab.id, item.id) ?? ui.starter);
  const [panel, setPanel] = useState<OutputTab>('results');

  useDraftSaver((q) => progressStore.saveDraft(lab.id, item.id, q), query, 400);

  const run = () => {
    setPanel('results');
    void engine.run(query);
  };
  const sample = (t: TableInfo) => {
    setPanel('results');
    void engine.sample(t);
  };

  const schemaViewer = (
    <SchemaViewer
      schema={engine.schema}
      disabled={engine.running || engine.status !== 'ready'}
      onSample={sample}
      placeholder={engine.status === 'idle' ? SCHEMA_PLACEHOLDER : engine.status === 'error' ? SCHEMA_ERROR : undefined}
      unit={ui.unit}
      language={lab.language}
      flush
    />
  );

  const problem = <ProblemPane item={item} engine={engine} />;

  const schemaPane = (
    <section aria-label="Database Schema" className="fs-schema h-full overflow-y-auto bg-surface">
      {schemaViewer}
    </section>
  );

  const editor = (height: string) => (
    <QueryEditor
      value={query}
      onChange={setQuery}
      onRun={run}
      disabled={engine.status === 'loading' || engine.status === 'error'}
      running={engine.running}
      fontScale={prefs.textSizes.editor}
      theme={prefs.theme}
      statusText={engine.status === 'loading' ? 'Loading database…' : undefined}
      language={ui.monaco}
      title={ui.editorTitle}
      height={height}
    />
  );

  const output = (
    <section aria-label="Query output" className={cx('flex flex-col', CARD)}>
      <div role="tablist" aria-label="Output" className="flex shrink-0 gap-4 border-b border-line px-5">
        {(
          [
            ['results', 'Query Results'],
            ['schema', 'Database Schema'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={panel === id}
            onClick={() => setPanel(id)}
            className={cx(
              '-mb-px inline-flex items-center gap-1.5 border-b-2 py-3 text-sm font-medium',
              panel === id ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {label}
            {id === 'results' && engine.result && (
              <span className="rounded-full bg-subtle px-1.5 font-mono text-[0.625rem] text-muted">
                {engine.result?.ok ? engine.result.rowCount : 0}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className={cx('min-h-0 flex-1 overflow-y-auto', (panel === 'results' || engine.status === 'error') && 'p-5')}>
        {engine.status === 'error' ? (
          <ErrorScreen message={engine.error ?? 'Unknown error'} onRetry={engine.retry} />
        ) : panel === 'results' ? (
          <div className="fs-results space-y-4">
            {engine.check && <CheckBanner key={engine.runId} check={engine.check} />}
            <ResultsPanel result={engine.result} running={engine.running} altView={ui.altView} resultUnit={ui.resultUnit} />
          </div>
        ) : (
          <div className="fs-schema">{schemaViewer}</div>
        )}
      </div>
    </section>
  );

  if (!isDesktop) {
    return (
      <div className="space-y-4 p-4">
        <div className="overflow-hidden rounded-xl border border-line">{problem}</div>
        <div className="overflow-hidden rounded-xl border border-line">{schemaPane}</div>
        {editor('320px')}
        {output}
      </div>
    );
  }

  return <DesktopLayout problem={problem} schema={schemaPane} editor={<div className="h-full">{editor('100%')}</div>} output={output} />;
}

function DesktopLayout({ problem, schema, editor, output }: Record<'problem' | 'schema' | 'editor' | 'output', ReactNode>) {
  const cols = useSavedLayout('leetlab-cols');
  const left = useSavedLayout('leetlab-left');
  const right = useSavedLayout('leetlab-right');

  return (
    <Group id="leetlab-cols" orientation="horizontal" className="bg-page" defaultLayout={cols.defaultLayout} onLayoutChanged={cols.onLayoutChanged}>
      <Panel id="leetlab-left-col" defaultSize="50%" minSize={COL_MIN}>
        <Group id="leetlab-left" orientation="vertical" defaultLayout={left.defaultLayout} onLayoutChanged={left.onLayoutChanged}>
          <Panel id="leetlab-problem" defaultSize="60%" minSize={MIN}>
            {problem}
          </Panel>
          <ResizeHandle orientation="vertical" label="Resize problem and schema panes" />
          <Panel id="leetlab-schema" defaultSize="40%" minSize={MIN}>
            {schema}
          </Panel>
        </Group>
      </Panel>
      <ResizeHandle orientation="horizontal" label="Resize the two columns" />
      <Panel id="leetlab-right-col" defaultSize="50%" minSize={COL_MIN}>
        <div className="h-full py-3 pr-3">
          <Group id="leetlab-right" orientation="vertical" defaultLayout={right.defaultLayout} onLayoutChanged={right.onLayoutChanged}>
            <Panel id="leetlab-editor" defaultSize="55%" minSize={MIN}>
              {editor}
            </Panel>
            <ResizeHandle orientation="vertical" label="Resize editor and output panes" />
            <Panel id="leetlab-output" defaultSize="45%" minSize={MIN}>
              {output}
            </Panel>
          </Group>
        </div>
      </Panel>
    </Group>
  );
}
