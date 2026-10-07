// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from './AuthProvider';
import { Navbar } from '../components/Navbar';

const clerk = vi.hoisted(() => ({ isLoaded: true, isSignedIn: false }));

vi.mock('./config', () => ({
  clerkKey: 'pk_test_fake',
  hasValidClerkKey: true,
  isValidClerkKey: () => true,
}));

// A stand-in for Clerk's real components: this test checks how the app uses them, not what Clerk draws.
vi.mock('@clerk/react', () => ({
  ClerkProvider: ({ children, publishableKey }: { children: ReactNode; publishableKey: string }) => (
    <div data-testid="clerk-provider" data-key={publishableKey}>
      {children}
    </div>
  ),
  useAuth: () => ({ isLoaded: clerk.isLoaded, isSignedIn: clerk.isSignedIn }),
  SignInButton: ({ children }: { children: ReactNode }) => <div data-testid="clerk-sign-in">{children}</div>,
  UserButton: () => <div data-testid="clerk-user-button" />,
}));

const renderNavbar = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <Navbar />
      </AuthProvider>
    </MemoryRouter>,
  );

describe('Navbar with a Clerk key', () => {
  afterEach(() => {
    clerk.isLoaded = true;
    clerk.isSignedIn = false;
    localStorage.clear();
  });

  it("uses Clerk's own Sign in modal when signed out, wrapped around the app's button", async () => {
    renderNavbar();
    const slot = await screen.findByTestId('clerk-sign-in');
    expect(within(slot).getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByTestId('clerk-provider')).toHaveAttribute('data-key', 'pk_test_fake');
  });

  it("uses Clerk's own avatar menu when signed in, not the development one", async () => {
    clerk.isSignedIn = true;
    renderNavbar();
    expect(await screen.findByTestId('clerk-user-button')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'User account menu' })).not.toBeInTheDocument();
  });

  it('shows neither while Clerk is still loading', async () => {
    clerk.isLoaded = false;
    renderNavbar();
    expect(await screen.findByTestId('clerk-provider')).toBeInTheDocument();
    expect(screen.queryByTestId('clerk-sign-in')).not.toBeInTheDocument();
    expect(screen.queryByTestId('clerk-user-button')).not.toBeInTheDocument();
  });

  it('never offers the fake development sign-in', async () => {
    renderNavbar();
    await screen.findByTestId('clerk-sign-in');
    expect(localStorage.getItem('codeadda:auth:user')).toBeNull();
    expect(screen.queryByText(/Alex Rivera/)).not.toBeInTheDocument();
  });
});
