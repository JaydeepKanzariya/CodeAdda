// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('renders a Results view toggle when documents exist, toggles between table and documents view', async () => {
    const user = userEvent.setup();
    const doc1 = { _id: 1, title: 'Film A' };
    const doc2 = { _id: 2, title: 'Film B' };
    render(
      <ResultsPanel
        running={false}
        result={{
          ok: true,
          columns: ['_id', 'title'],
          rows: [[1, 'Film A'], [2, 'Film B']],
          rowCount: 2,
          durationMs: 4,
          documents: [doc1, doc2],
        }}
      />,
    );

    const group = screen.getByRole('radiogroup', { name: 'Results view' });
    expect(group).toBeInTheDocument();
    const tableBtn = screen.getByRole('radio', { name: 'Table' });
    const docsBtn = screen.getByRole('radio', { name: 'Documents' });
    expect(tableBtn).toBeChecked();
    expect(docsBtn).not.toBeChecked();

    expect(screen.getAllByRole('row')).toHaveLength(3);

    await user.click(docsBtn);
    expect(docsBtn).toBeChecked();
    expect(tableBtn).not.toBeChecked();

    expect(screen.queryAllByRole('row')).toHaveLength(0);
    expect(screen.getByText(JSON.stringify(doc1, null, 2), { collapseWhitespace: false })).toBeInTheDocument();
    expect(screen.getByText(JSON.stringify(doc2, null, 2), { collapseWhitespace: false })).toBeInTheDocument();

    await user.click(tableBtn);
    expect(tableBtn).toBeChecked();
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });

  it('shows no view toggle when documents are not present', () => {
    render(
      <ResultsPanel
        running={false}
        result={{ ok: true, columns: ['id'], rows: [[1]], rowCount: 1, durationMs: 2 }}
      />,
    );
    expect(screen.queryByRole('radiogroup', { name: 'Results view' })).toBeNull();
  });
});
