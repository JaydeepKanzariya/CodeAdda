// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckBanner } from './CheckBanner';

const res = (rows: unknown[][]) => ({ ok: true as const, columns: ['n'], rows, rowCount: rows.length, durationMs: 0 });

describe('CheckBanner', () => {
  it('celebrates a pass', () => {
    render(<CheckBanner check={{ pass: true, reason: 'Your result matches the expected result.', missing: [], extra: [] }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Correct!');
  });

  it('explains a failure and shows the difference on request', async () => {
    render(
      <CheckBanner
        check={{ pass: false, reason: '1 expected row(s) missing and 1 unexpected row(s).', expected: res([[1], [2]]), actual: res([[1], [3]]), missing: [[2]], extra: [[3]] }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Not quite.');
    await userEvent.click(screen.getByRole('button', { name: 'Show difference' }));
    const expected = screen.getByRole('region', { name: 'Expected result' });
    const mine = screen.getByRole('region', { name: 'Your result' });
    expect(expected.querySelector('.bg-ok-bg')).toHaveTextContent('2');
    expect(mine.querySelector('.bg-bad-bg')).toHaveTextContent('3');
  });

  it('has no difference button when there is nothing to compare', () => {
    render(<CheckBanner check={{ pass: false, reason: 'Your query failed: boom', missing: [], extra: [] }} />);
    expect(screen.queryByRole('button', { name: 'Show difference' })).not.toBeInTheDocument();
  });
});
