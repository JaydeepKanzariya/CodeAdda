import { useState } from 'react';
import { Link } from 'react-router';
import type { Lab, LessonItem, TableInfo } from '@codeadda/core';
import { CheckBanner } from '../components/CheckBanner';
import { ErrorScreen } from '../components/ErrorScreen';
import { HintToggle } from '../components/HintToggle';
import { LessonHeader } from '../components/LessonHeader';
import { Markdown } from '../components/Markdown';
import { QueryEditor } from '../components/QueryEditor';
import { ResultsPanel } from '../components/ResultsPanel';
import { SchemaSection } from '../components/SchemaSection';
import { SchemaViewer } from '../components/SchemaViewer';
import { SolutionPanel } from '../components/SolutionPanel';
import { StepPlayer } from '../components/StepPlayer';
import { cx } from '../lib/cx';
import { usePrefs } from '../state/prefs';
import { progressStore } from '../state/progress';
import { skipTarget, type Tab } from './navigation';
import { useDraftSaver } from './useDraftSaver';
import { type LabEngine } from './useLabEngine';
import { labUi } from './labUi';

interface LessonFlowProps {
  lab: Lab;
  tab: Tab;
  item: LessonItem;
  number: number;
  engine: LabEngine;
}

export function LessonFlow({ lab, tab, item, number, engine }: LessonFlowProps) {
  const prefs = usePrefs();
  const ui = labUi(lab.language);
  const [query, setQuery] = useState(() => progressStore.getDraft(lab.id, item.id) ?? ui.starter);
  const [panel, setPanel] = useState<'results' | 'schema'>('results');

  useDraftSaver((q) => progressStore.saveDraft(lab.id, item.id, q), query, 400);

  // Only on a lab's very first lesson, and only for labs with at least two levels.
  const skip = tab === 'lessons' && lab.lessons[0]?.items[0]?.id === item.id ? skipTarget(lab) : undefined;

  const run = () => {
    setPanel('results');
    void engine.run(query);
  };
  const sample = (t: TableInfo) => {
    setPanel('results');
    void engine.sample(t);
  };

  return (
    <div className="space-y-8">
      <div className="fs-content">
        <LessonHeader tab={tab} item={item} number={number} />
      </div>

      {skip && (
        <p className="fs-content max-w-[760px] rounded-md border border-note-line bg-note-bg px-4 py-2.5 text-sm text-note">
          {ui.skipPrompt}{' '}
          <Link to={skip.path} className="font-semibold underline underline-offset-2">
            Skip to {skip.level} →
          </Link>
        </p>
      )}

      {item.steps && (
        <section aria-labelledby="watch-it-happen" className="fs-content">
          <h2 id="watch-it-happen" className="text-xs font-semibold tracking-wider text-brand uppercase">Watch it happen</h2>
          <p className="mt-1 mb-3 text-sm text-faint">Play it through, or step back and forth yourself.</p>
          <div className="max-w-[1100px]">
            <StepPlayer script={item.steps} />
          </div>
        </section>
      )}
      {item.stepsError && (
        <p role="note" className="rounded-md border border-warn-line bg-warn-bg px-4 py-3 text-sm text-warn">
          This lesson's animation could not be loaded: {item.stepsError}
        </p>
      )}

      <section aria-labelledby="your-turn" className="fs-content space-y-3">
        <h2 id="your-turn" className="text-xs font-semibold tracking-wider text-brand uppercase">Your turn</h2>
        {item.context && (
          <div className="max-w-[760px] rounded-r-lg border-l-[3px] border-brand bg-surface px-5 py-4 shadow-soft">
            <Markdown className="text-md">{item.context}</Markdown>
          </div>
        )}
        <div className="max-w-[760px] rounded-r-lg border-l-[3px] border-brand bg-brand-muted px-5 py-4">
          <Markdown className="text-md [&_p]:text-ink [&_p:first-child>strong:first-child]:text-brand">{`**Task:** ${item.task}`}</Markdown>
        </div>
        <HintToggle hints={item.hints} />
      </section>

      {engine.status === 'error' ? (
        <ErrorScreen message={engine.error ?? 'Unknown error'} onRetry={engine.retry} />
      ) : (
        <div className="space-y-4">
          <QueryEditor
            value={query}
            onChange={setQuery}
            onRun={run}
            disabled={engine.status !== 'ready'}
            running={engine.running}
            fontScale={prefs.textSizes.editor}
            theme={prefs.theme}
            statusText={engine.status === 'loading' ? 'Loading database…' : undefined}
            language={ui.monaco}
            title={ui.editorTitle}
          />
          <SolutionPanel solution={item.solution} onLoad={setQuery} />
          {engine.check && (
            <div className="fs-results">
              <CheckBanner key={engine.runId} check={engine.check} />
            </div>
          )}
          <div className="rounded-xl border border-line bg-surface shadow-soft">
            <div role="tablist" aria-label="Output" className="flex gap-4 border-b border-line px-5">
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
            <div className="p-5">
              {panel === 'results' ? (
                <div className="fs-results">
                  <ResultsPanel result={engine.result} running={engine.running} altView={ui.altView} resultUnit={ui.resultUnit} />
                </div>
              ) : (
                <div className="fs-schema">
                  <SchemaViewer schema={engine.schema} disabled={engine.running || engine.status !== 'ready'} onSample={sample} unit={ui.unit} language={lab.language} />
                </div>
              )}
            </div>
          </div>
          <SchemaSection>
            <div className="fs-schema">
              <SchemaViewer schema={engine.schema} disabled={engine.running || engine.status !== 'ready'} onSample={sample} unit={ui.unit} language={lab.language} />
            </div>
          </SchemaSection>
        </div>
      )}
    </div>
  );
}
