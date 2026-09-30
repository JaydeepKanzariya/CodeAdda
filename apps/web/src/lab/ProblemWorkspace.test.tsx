// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Lab, LessonItem } from '@codeadda/core';
import { progressStore } from '../state/progress';
import { ProblemWorkspace } from './ProblemWorkspace';
import { STARTER_SQL, type LabEngine } from './useLabEngine';

vi.mock('../components/QueryEditor', () => ({
  QueryEditor: ({ onRun }: { onRun: () => void }) => <button type="button" aria-label="Run Query" onClick={onRun} />,
}));

const item: LessonItem = {
  kind: 'problem', id: 'ws-p', title: 'Cheap Snacks', chapter: 'SELECT', order: 1, check: 'rows-unordered', difficulty: 'Easy',
  body: 'Find the cheap snacks.', task: 'Return the snack names.', hints: [], solution: 'SELECT 1;', path: 'problems/p.md',
};
const lab = { id: 'ws-lab', title: 'SQL Lab', subtitle: '', language: 'sql', lessons: [], problems: [], datasets: {}, errors: [] } as unknown as Lab;

function makeEngine(status: LabEngine['status']): LabEngine {
  return {
    status, running: false, runId: 0, load: vi.fn(), run: vi.fn(), sample: vi.fn(), reset: vi.fn(), retry: vi.fn(),
    schema: status === 'ready' ? { tables: [], relationships: [] } : undefined,
  } as unknown as LabEngine;
}

function mockViewport(desktop: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: desktop,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

// The panel library observes element sizes; jsdom has no ResizeObserver.
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', NoopResizeObserver);
});
afterEach(() => vi.unstubAllGlobals());

function expectFourRegions() {
  expect(screen.getByRole('heading', { level: 1, name: 'Cheap Snacks' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Database Schema' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Run Query' })).toBeInTheDocument();
  expect(screen.getByRole('tablist', { name: 'Output' })).toBeInTheDocument();
}

describe('ProblemWorkspace', () => {
  it('renders four panes and three separators on desktop', () => {
    mockViewport(true);
    render(<ProblemWorkspace lab={lab} item={item} engine={makeEngine('idle')} />);
    expectFourRegions();
    expect(screen.getAllByRole('separator').map((s) => s.getAttribute('aria-label'))).toEqual([
      'Resize problem and schema panes',
      'Resize the two columns',
      'Resize editor and output panes',
    ]);
  });

  it('stacks the panes without separators on mobile', () => {
    mockViewport(false);
    render(<ProblemWorkspace lab={lab} item={item} engine={makeEngine('idle')} />);
    expectFourRegions();
    expect(screen.queryAllByRole('separator')).toHaveLength(0);
  });

  it('runs the starter SQL when there is no draft', async () => {
    mockViewport(true);
    const engine = makeEngine('idle');
    render(<ProblemWorkspace lab={lab} item={item} engine={engine} />);
    await userEvent.click(screen.getByRole('button', { name: 'Run Query' }));
    expect(engine.run).toHaveBeenCalledWith(STARTER_SQL);
  });

  it('runs the saved draft', async () => {
    mockViewport(true);
    progressStore.saveDraft(lab.id, 'ws-draft', 'SELECT 42;');
    const engine = makeEngine('ready');
    render(<ProblemWorkspace lab={lab} item={{ ...item, id: 'ws-draft' }} engine={engine} />);
    await userEvent.click(screen.getByRole('button', { name: 'Run Query' }));
    expect(engine.run).toHaveBeenCalledWith('SELECT 42;');
  });

  it('asks to load the database in the idle schema pane', () => {
    mockViewport(true);
    render(<ProblemWorkspace lab={lab} item={item} engine={makeEngine('idle')} />);
    expect(screen.getByRole('region', { name: 'Database Schema' })).toHaveTextContent(/Press "Load Database"/);
  });

  it('explains a failed load in the schema pane', () => {
    mockViewport(true);
    render(<ProblemWorkspace lab={lab} item={item} engine={{ ...makeEngine('error'), error: 'boom' } as LabEngine} />);
    const pane = screen.getByRole('region', { name: 'Database Schema' });
    expect(pane).toHaveTextContent("Couldn't load the challenge database");
    expect(pane).not.toHaveTextContent('Loading schema…');
  });
});

describe('ProblemWorkspace saved layouts', () => {
  const KEYS = ['leetlab-cols', 'leetlab-left', 'leetlab-right'].map((id) => `react-resizable-panels:${id}`);
  afterEach(() => KEYS.forEach((k) => localStorage.removeItem(k)));

  it.each(['not json', 'null', '[1,2]', '{"a":"x"}'])('renders and drops a corrupt saved layout (%s)', (bad) => {
    mockViewport(true);
    KEYS.forEach((k) => localStorage.setItem(k, bad));
    render(<ProblemWorkspace lab={lab} item={item} engine={makeEngine('idle')} />);
    expectFourRegions();
    for (const k of KEYS) expect(localStorage.getItem(k)).toBeNull();
  });

  it('keeps a valid saved layout', () => {
    mockViewport(true);
    const good = '{"leetlab-left-col":40,"leetlab-right-col":60}';
    localStorage.setItem(KEYS[0]!, good);
    render(<ProblemWorkspace lab={lab} item={item} engine={makeEngine('idle')} />);
    expect(localStorage.getItem(KEYS[0]!)).toBe(good);
  });
});

describe('ProblemWorkspace output', () => {
  it('shows the row-count badge only after a result exists', () => {
    mockViewport(true);
    const { rerender } = render(<ProblemWorkspace lab={lab} item={item} engine={makeEngine('ready')} />);
    expect(screen.getByRole('tab', { name: 'Query Results' })).toBeInTheDocument();
    const withResult = {
      ...makeEngine('ready'),
      result: { ok: true, columns: ['n'], rows: [[1], [2], [3]], rowCount: 3, durationMs: 1 },
    } as LabEngine;
    rerender(<ProblemWorkspace lab={lab} item={item} engine={withResult} />);
    expect(screen.getByRole('tab', { name: 'Query Results 3' })).toBeInTheDocument();
  });

  it('labels the problem pane by its title and the output card as a region', () => {
    mockViewport(true);
    render(<ProblemWorkspace lab={lab} item={item} engine={makeEngine('idle')} />);
    expect(screen.getByRole('region', { name: 'Cheap Snacks' })).toBeInTheDocument();
    const output = screen.getByRole('region', { name: 'Query output' });
    expect(output).toContainElement(screen.getByRole('tablist', { name: 'Output' }));
  });
});
