// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthProvider, useAuth } from './AuthProvider';
import { Navbar } from '../components/Navbar';

// A production build with no Clerk key.
vi.mock('./config', () => ({
  clerkKey: undefined,
  hasValidClerkKey: false,
  isValidClerkKey: () => false,
}));

function Probe() {
  const { isAuthAvailable, isClerkConfigured, isSignedIn } = useAuth();
  return <p data-testid="probe">{JSON.stringify({ isAuthAvailable, isClerkConfigured, isSignedIn })}</p>;
}

describe('production build without a Clerk key', () => {
  // Vite sets import.meta.env.DEV to false in a production build; do the same here.
  beforeEach(() => vi.stubEnv('DEV', false));
  afterEach(() => vi.unstubAllEnvs());

  it('offers no sign-in at all', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Probe />
          <Navbar />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(JSON.parse(screen.getByTestId('probe').textContent!)).toEqual({
      isAuthAvailable: false,
      isClerkConfigured: false,
      isSignedIn: false,
    });
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('cannot be signed in by a leftover fake user in localStorage', () => {
    localStorage.setItem('codeadda:auth:user', JSON.stringify({ id: 'x', name: 'Alex Rivera', email: 'a@b.c', provider: 'github' }));
    render(
      <MemoryRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: 'User account menu' })).not.toBeInTheDocument();
    localStorage.clear();
  });
});
