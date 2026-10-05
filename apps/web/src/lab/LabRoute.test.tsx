// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Component, Suspense, type ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

const loadLab = vi.fn();
vi.mock('../content/registry', async (importActual) => ({ ...(await importActual<object>()), loadLab }));
vi.mock('./useLabEngine', () => ({ useLabEngine: () => ({ status: 'loading', running: false }) }));
const { LabRoute } = await import('./LabRoute');

class Boom extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p>boom</p> : this.props.children;
  }
}

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Boom>
        <Suspense fallback={<p>Loading lab…</p>}>
          <Routes><Route path="/:labId" element={<LabRoute />} /><Route path="/:labId/:tab/:itemId" element={<LabRoute />} /></Routes>
        </Suspense>
      </Boom>
    </MemoryRouter>,
  );

describe('LabRoute', () => {
  beforeEach(() => {
    loadLab.mockReset();
  });

  it('shows the 404 page for an unknown lab without loading anything', () => {
    at('/nope');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(loadLab).not.toHaveBeenCalled();
  });

  it('shows the Suspense fallback while a known lab loads', () => {
    loadLab.mockReturnValue(new Promise(() => {}));
    at('/postgres');
    expect(screen.getByText('Loading lab…')).toBeInTheDocument();
    expect(loadLab).toHaveBeenCalledWith('postgres');
  });

  it('reaches the error boundary when the lab chunk fails to load', async () => {
    const failed = Promise.reject(new Error('chunk failed'));
    failed.catch(() => {});
    loadLab.mockReturnValue(failed);
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => {
      at('/postgres/lessons/x');
    });
    expect(await screen.findByText('boom')).toBeInTheDocument();
    quiet.mockRestore();
  });
});
