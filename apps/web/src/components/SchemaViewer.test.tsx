// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SchemaInfo } from '@codeadda/core';
import { SchemaViewer } from './SchemaViewer';
import { SchemaSection } from './SchemaSection';

const schema: SchemaInfo = {
  tables: [
    {
      name: 'users', description: 'Customers', rowCount: 15, sampleQuery: 'SELECT * FROM users LIMIT 5;',
      columns: [{ name: 'id', type: 'integer', displayType: 'SERIAL', description: 'Unique user id', nullable: false, isPrimary: true, isForeign: false }],
    },
    {
      name: 'orders', description: 'Orders', rowCount: 25, sampleQuery: 'SELECT * FROM orders LIMIT 5;',
      columns: [{ name: 'user_id', type: 'integer', displayType: 'INTEGER', nullable: false, isPrimary: false, isForeign: true, references: 'users(id)' }],
    },
  ],
  relationships: [{ from: 'orders', column: 'user_id', to: 'users', toColumn: 'id', kind: 'many-to-one', description: 'Each order is placed by one user' }],
};

describe('SchemaViewer', () => {
  it('drops the card border and the inner scroll in flush mode', () => {
    const { container } = render(<SchemaViewer schema={schema} onSample={() => {}} flush />);
    expect(container.querySelector('[class*="max-h-"]')).toBeNull();
    expect(container.querySelector('[data-schema-body]')).not.toHaveClass('overflow-y-auto');
    expect(container.querySelector('[data-schema-viewer]')).not.toHaveClass('rounded-xl');
    expect(screen.getByRole('heading', { name: 'Database Schema' })).toBeInTheDocument();
  });

  it('keeps the bounded card by default', () => {
    const { container } = render(<SchemaViewer schema={schema} onSample={() => {}} />);
    expect(container.querySelector('[data-schema-body]')).toHaveClass('max-h-[420px]');
    expect(container.querySelector('[data-schema-viewer]')).toHaveClass('rounded-xl');
  });

  it('shows the placeholder header and message when there is no schema', () => {
    render(<SchemaViewer onSample={() => {}} placeholder={{ subtitle: 'Load it first', message: 'Press the button.' }} />);
    expect(screen.getByRole('heading', { name: 'Database Schema' })).toBeInTheDocument();
    expect(screen.getByText('Load it first')).toBeInTheDocument();
    expect(screen.getByText('Press the button.')).toBeInTheDocument();
    expect(screen.queryByText('Loading schema…')).not.toBeInTheDocument();
  });

  it('expands the first table and lists relationships', () => {
    render(<SchemaViewer schema={schema} onSample={() => {}} />);
    expect(screen.getByRole('button', { name: /users/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('PK')).toBeInTheDocument();
    expect(screen.getByText('SERIAL')).toBeInTheDocument();
    expect(screen.getByText('Unique user id')).toBeInTheDocument();
    expect(screen.getByText('(many-to-one)')).toBeInTheDocument();
    expect(screen.getByText('Each order is placed by one user')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Database Schema' })).toBeInTheDocument();
  });

  it('shows FK details and requests sample data', async () => {
    const onSample = vi.fn();
    render(<SchemaViewer schema={schema} onSample={onSample} />);
    await userEvent.click(screen.getByRole('button', { name: /orders/ }));
    expect(screen.getByText('FK')).toBeInTheDocument();
    const row = screen.getByText('user_id').closest('tr')!;
    expect(row).toHaveTextContent('FK');
    expect(row.querySelectorAll('td')[2]).toBeEmptyDOMElement();
    await userEvent.click(screen.getAllByRole('button', { name: 'View Sample Data' })[1]!);
    expect(onSample).toHaveBeenCalledWith(schema.tables[1]);
  });

  it('disables "View Sample Data" while a query runs', async () => {
    const onSample = vi.fn();
    render(<SchemaViewer schema={schema} onSample={onSample} disabled />);
    const button = screen.getByRole('button', { name: 'View Sample Data' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onSample).not.toHaveBeenCalled();
  });
});

describe('SchemaSection', () => {
  it('starts expanded and toggles its children', async () => {
    render(<SchemaSection><p>inside</p></SchemaSection>);
    expect(screen.getByText('inside')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Database schema' }));
    expect(screen.queryByText('inside')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Database schema' }));
    expect(screen.getByText('inside')).toBeInTheDocument();
  });
});
