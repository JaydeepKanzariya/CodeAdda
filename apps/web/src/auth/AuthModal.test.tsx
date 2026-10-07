// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthProvider';
import { AuthModal } from './AuthModal';

function TestTrigger() {
  const { openSignIn, openSignUp, user } = useAuth();
  return (
    <div>
      <button onClick={openSignIn}>Open Sign In</button>
      <button onClick={openSignUp}>Open Sign Up</button>
      {user && <span>Signed in as {user.name}</span>}
      <AuthModal />
    </div>
  );
}

describe('AuthModal', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('renders nothing when closed', () => {
    render(
      <AuthProvider>
        <TestTrigger />
      </AuthProvider>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens in Sign In mode with matching header, buttons, and Secured by clerk', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <TestTrigger />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Open Sign In' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sign in to CodeAdda' })).toBeInTheDocument();
    expect(screen.getByText('Welcome back! Please sign in to continue')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue with GitHub/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument();
    expect(screen.getByText(/Secured by/i)).toBeInTheDocument();
    expect(screen.getByText('Last used')).toBeInTheDocument();
  });

  it('switches between Sign In and Sign Up views', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <TestTrigger />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Open Sign In' }));
    expect(screen.getByRole('heading', { name: 'Sign in to CodeAdda' })).toBeInTheDocument();

    // Click "Sign up" toggle link
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByText('Welcome! Please fill in the details to get started.')).toBeInTheDocument();

    // Click "Sign in" toggle link
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('heading', { name: 'Sign in to CodeAdda' })).toBeInTheDocument();
  });

  it('closes when close button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <TestTrigger />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Open Sign In' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('authenticates when a provider button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <TestTrigger />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Open Sign In' }));
    await user.click(screen.getByRole('button', { name: /Continue with GitHub/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText(/Signed in as Alex Rivera/i)).toBeInTheDocument();
  });
});
