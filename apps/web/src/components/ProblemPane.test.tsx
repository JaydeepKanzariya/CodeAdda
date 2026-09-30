// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LessonItem } from '@codeadda/core';
import type { LabEngine } from '../lab/useLabEngine';
import { ProblemPane } from './ProblemPane';

const item: LessonItem = {
  kind: 'problem', id: 'p', title: 'Cheap Snacks', chapter: 'SELECT', order: 1, check: 'rows-unordered', difficulty: 'Easy',
  body: 'Find the snacks that cost less than two coins.', task: 'Return the snack names.', hints: ['Filter with WHERE price < 2.'],
  solution: 'SELECT name FROM snacks WHERE price < 2;', path: 'problems/p.md',
  tables: 'Table: snacks\n\n```text\n+------+------+\n| name | text |\n+------+------+\n```\n\nname is unique.',
  example: '```text\nInput: ...\nOutput: ...\n```',
};

function makeEngine(status: LabEngine['status']): LabEngine {
  return {
    status, running: false, runId: 0, load: vi.fn(), run: vi.fn(), sample: vi.fn(), reset: vi.fn(), retry: vi.fn(),
  } as unknown as LabEngine;
}

describe('ProblemPane', () => {
  it('renders the title, the difficulty badge and the description', () => {
    render(<ProblemPane item={item} engine={makeEngine('idle')} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Cheap Snacks' })).toBeInTheDocument();
    expect(screen.getByText('Easy')).toBeInTheDocument();
    expect(screen.getByText('Find the snacks that cost less than two coins.')).toBeInTheDocument();
  });

  it('renders the tables block in a <pre>, with the notes below it', () => {
    const { container } = render(<ProblemPane item={item} engine={makeEngine('idle')} />);
    const pre = container.querySelector('pre[data-tables]');
    expect(pre).not.toBeNull();
    expect(pre!.textContent).toContain('| name | text |');
    expect(pre!.textContent).not.toContain('```');
    expect(screen.getByText('name is unique.')).toBeInTheDocument();
  });

  it('shows the example in an open <details> element', () => {
    const { container } = render(<ProblemPane item={item} engine={makeEngine('idle')} />);
    const details = container.querySelector('details');
    expect(details).not.toBeNull();
    expect(details).toHaveAttribute('open');
    expect(details!.querySelector('summary')).toHaveTextContent('Example');
    expect(details).toHaveTextContent('Input: ...');
  });

  it('renders without tables or an example', () => {
    const { container } = render(<ProblemPane item={{ ...item, tables: undefined, example: undefined }} engine={makeEngine('idle')} />);
    expect(container.querySelector('pre[data-tables]')).toBeNull();
    expect(container.querySelector('details')).toBeNull();
    expect(screen.getByText('Task:')).toBeInTheDocument();
  });

  it('offers Load Database while idle and loads on click', async () => {
    const engine = makeEngine('idle');
    render(<ProblemPane item={item} engine={engine} />);
    const button = screen.getByRole('button', { name: 'Load Database' });
    expect(button).toBeEnabled();
    await userEvent.click(button);
    expect(engine.load).toHaveBeenCalled();
  });

  it('shows Loading… while loading', () => {
    render(<ProblemPane item={item} engine={makeEngine('loading')} />);
    expect(screen.getByRole('button', { name: 'Loading…' })).toBeDisabled();
  });

  it('shows Database Loaded when ready', () => {
    render(<ProblemPane item={item} engine={makeEngine('ready')} />);
    const loaded = screen.getByRole('button', { name: 'Database Loaded' });
    expect(loaded).toBeDisabled();
    expect(loaded).toHaveClass('bg-ok-bg', 'text-ok');
    expect(loaded).not.toHaveClass('text-brand');
  });

  it('toggles the hint box', async () => {
    render(<ProblemPane item={item} engine={makeEngine('idle')} />);
    expect(screen.queryByText('Hint:')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show Hint' }));
    expect(screen.getByText('Hint:')).toBeInTheDocument();
    expect(screen.getByText('Filter with WHERE price < 2.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hide Hint' }));
    expect(screen.queryByText('Hint:')).not.toBeInTheDocument();
  });

  it('has no hint button without hints', () => {
    render(<ProblemPane item={{ ...item, hints: [] }} engine={makeEngine('idle')} />);
    expect(screen.queryByRole('button', { name: /Hint/ })).not.toBeInTheDocument();
  });
});
