// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultsPanel } from './ResultsPanel';

describe('ResultsPanel', () => {
  it('shows a placeholder before any query', () => {
    render(<ResultsPanel running={false} />);
    expect(screen.getByText('Run a query to see results')).toBeInTheDocument();
  });

  it('renders rows, NULLs and the row count', () => {
    render(
      <ResultsPanel
        running={false}
        result={{ ok: true, columns: ['id', 'phone'], rows: [[1, null], [2, '555']], rowCount: 2, durationMs: 3 }}
      />,
    );
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText('NULL')).toBeInTheDocument();
    expect(screen.getByText('2 rows · 3 ms')).toBeInTheDocument();
  });

  it('renders errors as an alert', () => {
    render(<ResultsPanel running={false} result={{ ok: false, error: { message: 'syntax error at or near "FORM"', position: 10 } }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('syntax error at or near "FORM"');
    expect(screen.getByRole('alert')).toHaveTextContent('At character 10');
  });

  it('renders notices', () => {
    render(<ResultsPanel running={false} result={{ ok: true, columns: [], rows: [], rowCount: 0, durationMs: 1, notice: 'Query OK. 1 row(s) affected.' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Query OK. 1 row(s) affected.');
  });
});
