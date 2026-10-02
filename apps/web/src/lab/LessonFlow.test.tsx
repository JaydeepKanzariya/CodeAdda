// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { Lab, LessonItem } from '@codeadda/core';
import { LessonFlow } from './LessonFlow';
import type { LabEngine } from './useLabEngine';

vi.mock('../components/QueryEditor', () => ({
  QueryEditor: ({ onRun }: { onRun: () => void }) => <button type="button" aria-label="Run Query" onClick={onRun} />,
}));

const base: LessonItem = {
  kind: 'lesson', id: 'x', title: 'SELECT All Columns', chapter: 'Querying Data', order: 1, dataset: 'shop', check: 'rows-unordered',
  body: 'Learn to read a whole table.', task: 'Return every column.', hints: ['Use *'], solution: 'SELECT * FROM users;', path: 'lessons/x.md',
  context: 'The users table has 15 rows.',
};
const lab = { id: 'sql', title: 'SQL Lab', subtitle: '', language: 'sql', lessons: [], problems: [], datasets: {}, errors: [] } as unknown as Lab;
const engine = {
  status: 'ready', running: false, runId: 0, run: vi.fn(), sample: vi.fn(), reset: vi.fn(), retry: vi.fn(),
  schema: { tables: [], relationships: [] },
} as unknown as LabEngine;

describe('LessonFlow', () => {
  it('renders the header, context, task and output tabs', () => {
    render(<LessonFlow lab={lab} tab="lessons" item={base} number={1} engine={engine} />);
    expect(screen.getByText('Querying Data · Lesson 1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'SELECT All Columns' })).toBeInTheDocument();
    expect(screen.getByText('The users table has 15 rows.')).toBeInTheDocument();
    expect(screen.getByText('Task:')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Query Results/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Database Schema' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Watch it happen' })).not.toBeInTheDocument();
  });

  it('shows the player when the lesson has steps', () => {
    const steps = {
      tables: { t: { columns: ['a'], rows: [[1]] } },
      steps: [
        { label: 'One', caption: 'First', highlight: [], dim: [], labels: {}, notes: [] },
        { label: 'Two', caption: 'Second', highlight: [], dim: [], labels: {}, notes: [] },
      ],
    };
    render(<LessonFlow lab={lab} tab="lessons" item={{ ...base, steps }} number={1} engine={engine} />);
    expect(screen.getByRole('heading', { name: 'Watch it happen' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Watch it happen' })).toBeInTheDocument();
  });

  it('shows a note instead of the player when the script is broken', () => {
    render(<LessonFlow lab={lab} tab="lessons" item={{ ...base, stepsError: 'step 2: unknown table "x"' }} number={1} engine={engine} />);
    expect(screen.getByText(/animation could not be loaded/)).toBeInTheDocument();
  });
});

describe('LessonFlow skip banner', () => {
  const first: LessonItem = { ...base, id: 'first', chapter: 'Basics' };
  const later: LessonItem = { ...base, id: 'later', chapter: 'Joins' };
  const leveled = {
    ...lab, id: 'pg', title: 'PostgreSQL Lab',
    lessons: [{ title: 'Basics', items: [first] }, { title: 'Joins', items: [later] }],
    levels: [{ title: 'Beginner', from: 'Basics' }, { title: 'Intermediate', from: 'Joins' }],
  } as unknown as Lab;
  const renderFlow = (l: Lab, item: LessonItem) =>
    render(<MemoryRouter><LessonFlow lab={l} tab="lessons" item={item} number={1} engine={engine} /></MemoryRouter>);

  it('shows on the first lesson and links to the first lesson of level 2', () => {
    renderFlow(leveled, first);
    expect(screen.getByText(/Already know SQL\?/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to Intermediate →' })).toHaveAttribute('href', '/pg/lessons/later');
  });

  it('is absent on later lessons and in labs without levels', () => {
    const { unmount } = renderFlow(leveled, later);
    expect(screen.queryByText(/Already know SQL\?/)).toBeNull();
    unmount();
    renderFlow({ ...leveled, levels: undefined } as Lab, first);
    expect(screen.queryByText(/Already know SQL\?/)).toBeNull();
  });
});
