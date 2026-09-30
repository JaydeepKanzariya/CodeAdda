// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppErrorBoundary } from './AppErrorBoundary';

function Boom(): never {
  throw new Error('kaboom');
}

describe('AppErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(<AppErrorBoundary><p>fine</p></AppErrorBoundary>);
    expect(screen.getByText('fine')).toBeInTheDocument();
  });

  it('shows a friendly message with a reload button when a child throws', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onReload = vi.fn();
    render(<AppErrorBoundary onReload={onReload}><Boom /></AppErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent(/Something went wrong/);
    expect(screen.getByRole('alert')).toHaveTextContent('kaboom');
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(onReload).toHaveBeenCalled();
    spy.mockRestore();
  });
});
