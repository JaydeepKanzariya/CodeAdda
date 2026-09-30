// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { StepScript } from '@codeadda/core';
import { STEP_MS, StepPlayer } from './StepPlayer';

const script: StepScript = {
  tables: {
    users: { columns: ['id', 'name', 'phone'], rows: [[1, 'Ana', '555-0101'], [2, 'Ben', null]] },
    result: { label: 'result', columns: ['name'], rows: [['Ana']] },
  },
  steps: [
    { label: 'A table', caption: 'This is `users`.', show: ['users'], highlight: [], dim: [], labels: {}, notes: [] },
    {
      label: 'Filter', caption: 'Keep one row.', show: ['users'],
      highlight: [{ table: 'users', row: 1, tone: 'kept' }, { table: 'users', cell: [1, 'name'], tone: 'focus' }],
      dim: [{ table: 'users', rows: [2] }], labels: { users: 'users -- filtered' },
      notes: [{ title: '1 row kept', text: 'Ben is dropped.', tone: 'info' }],
    },
    { label: 'Result', caption: 'The result.', highlight: [], dim: [], labels: {}, notes: [] },
  ],
};

const caption = () => screen.getByTestId('step-caption');
const cellsOf = (table: string) => within(document.querySelector(`[data-table="${table}"]`) as HTMLElement).getAllByRole('cell');

describe('StepPlayer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the first step and only the tables it lists', () => {
    render(<StepPlayer script={script} />);
    expect(caption()).toHaveTextContent('This is users.');
    expect(document.querySelector('[data-table="users"]')).toBeInTheDocument();
    expect(document.querySelector('[data-table="result"]')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous step' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'A table' })).toHaveAttribute('aria-current', 'step');
  });

  it('renders NULL cells as a muted NULL', () => {
    render(<StepPlayer script={script} />);
    const nullCell = cellsOf('users')[5]!;
    expect(nullCell).toHaveTextContent('NULL');
    expect(nullCell.className).toMatch(/italic/);
  });

  it('right-aligns numbers and numeric-looking strings, but not other text', () => {
    const money: StepScript = {
      tables: { orders: { columns: ['id', 'total', 'neg', 'phone', 'name'], rows: [[1, '19.99', '-5', '555-0101', 'Ana']] } },
      steps: [{ label: 'Orders', caption: 'Orders.', highlight: [], dim: [], labels: {}, notes: [] }],
    };
    render(<StepPlayer script={money} />);
    const [id, total, neg, phone, name] = cellsOf('orders');
    expect(id!.className).toMatch(/text-right/);
    expect(total!.className).toMatch(/text-right/);
    expect(neg!.className).toMatch(/text-right/);
    expect(phone!.className).not.toMatch(/text-right/);
    expect(name!.className).not.toMatch(/text-right/);
  });

  it('applies highlights with cell > row precedence, dims rows, overrides labels and shows notes', () => {
    render(<StepPlayer script={script} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    const cells = cellsOf('users');
    expect(cells[0]).toHaveAttribute('data-tone', 'kept');
    expect(cells[1]).toHaveAttribute('data-tone', 'focus');
    expect(cells[3]).not.toHaveAttribute('data-tone');
    expect(cells[3]!.closest('tr')!.className).toMatch(/opacity/);
    expect(screen.getByText('users -- filtered')).toBeInTheDocument();
    expect(screen.getByText('1 row kept')).toBeInTheDocument();
  });

  it('jumps to a step from its label, and disables Next at the end', () => {
    render(<StepPlayer script={script} />);
    fireEvent.click(screen.getByRole('button', { name: 'Result' }));
    expect(caption()).toHaveTextContent('The result.');
    expect(document.querySelector('[data-table="result"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
  });

  it('autoplays through the steps, stops at the end and can replay', () => {
    render(<StepPlayer script={script} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(STEP_MS));
    expect(caption()).toHaveTextContent('Keep one row.');
    act(() => vi.advanceTimersByTime(STEP_MS));
    expect(caption()).toHaveTextContent('The result.');
    act(() => vi.advanceTimersByTime(STEP_MS));
    expect(screen.getByRole('button', { name: 'Replay' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Replay' }));
    expect(caption()).toHaveTextContent('This is users.');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('pauses when the user steps manually', () => {
    render(<StepPlayer script={script} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(STEP_MS * 2));
    expect(caption()).toHaveTextContent('Keep one row.');
  });

  it('handles arrow keys and Space only inside the player', () => {
    render(
      <>
        <input aria-label="elsewhere" />
        <StepPlayer script={script} />
      </>,
    );
    fireEvent.keyDown(screen.getByLabelText('elsewhere'), { key: 'ArrowRight' });
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(caption()).toHaveTextContent('This is users.');
    const player = screen.getByRole('group', { name: 'Watch it happen' });
    fireEvent.keyDown(player, { key: 'ArrowRight' });
    expect(caption()).toHaveTextContent('Keep one row.');
    fireEvent.keyDown(player, { key: 'ArrowLeft' });
    expect(caption()).toHaveTextContent('This is users.');
    fireEvent.keyDown(player, { key: ' ' });
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('moves focus to the player when Next or Previous becomes disabled while focused', () => {
    render(<StepPlayer script={script} />);
    const player = screen.getByRole('group', { name: 'Watch it happen' });
    const next = screen.getByRole('button', { name: 'Next step' });
    next.focus();
    fireEvent.click(next);
    expect(next).toHaveFocus();
    fireEvent.click(next);
    expect(next).toBeDisabled();
    expect(player).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    expect(caption()).toHaveTextContent('Keep one row.');
    const prev = screen.getByRole('button', { name: 'Previous step' });
    prev.focus();
    fireEvent.keyDown(prev, { key: 'ArrowLeft' });
    expect(prev).toBeDisabled();
    expect(player).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(caption()).toHaveTextContent('Keep one row.');
  });

  it('lets a tone colour a NULL cell instead of the muted colour', () => {
    const toned: StepScript = {
      tables: script.tables,
      steps: [{ label: 'Null', caption: 'Null.', highlight: [{ table: 'users', row: 2, tone: 'removed' }], dim: [], labels: {}, notes: [] }],
    };
    render(<StepPlayer script={toned} />);
    const nullCell = cellsOf('users')[5]!;
    expect(nullCell).toHaveAttribute('data-tone', 'removed');
    expect(nullCell.className).toMatch(/italic/);
    expect(nullCell.className).toMatch(/text-bad/);
    expect(nullCell.className).not.toMatch(/text-faint/);
  });

  it('clears its timer on unmount', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(<StepPlayer script={script} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.runAllTimers());
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});
