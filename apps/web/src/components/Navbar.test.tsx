// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '../auth';
import { Navbar } from './Navbar';

const renderAt = (path: string) =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Navbar />
      </MemoryRouter>
    </AuthProvider>,
  );

describe('Navbar', () => {
  afterEach(() => {
    // jsdom has no scrollIntoView; tests that need it install a spy.
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it('puts every lab name in the swipeable link strip', () => {
    renderAt('/');
    const strip = screen.getByTestId('lab-links');
    expect(within(strip).getByRole('link', { name: 'SQL Lab' })).toBeInTheDocument();
    expect(within(strip).getByRole('link', { name: 'PostgreSQL Lab' })).toBeInTheDocument();
    expect(within(strip).getByRole('link', { name: 'MongoDB Lab' })).toBeInTheDocument();
    expect(within(strip).getByRole('link', { name: 'Redis Lab' })).toBeInTheDocument();
    expect(strip).toHaveClass('no-scrollbar');
  });

  it('scrolls the active lab link into view', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderAt('/sql/lessons/select-all');
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole('link', { name: 'SQL Lab' }));
  });

  it('renders where scrollIntoView does not exist', () => {
    expect(() => renderAt('/sql/lessons/select-all')).not.toThrow();
  });

  it('renders the Sign in button when signed out', async () => {
    renderAt('/');
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });
});
