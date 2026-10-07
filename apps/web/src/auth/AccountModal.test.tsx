// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { AuthProvider } from './AuthProvider';
import { AccountModal } from './AccountModal';

const USER = { id: 'usr_1', name: 'Test Person', email: 'test.person@example.com', provider: 'github' as const };
const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';

function signInAs(user: object = USER) {
  localStorage.setItem('codeadda:auth:user', JSON.stringify(user));
}

function Harness() {
  const [open, setOpen] = useState(true);
  return <AccountModal isOpen={open} onClose={() => setOpen(false)} />;
}

const renderModal = () =>
  render(
    <AuthProvider>
      <Harness />
    </AuthProvider>,
  );

describe('AccountModal (development fallback)', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('shows nothing when nobody is signed in', () => {
    renderModal();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it("shows the signed-in person's own name and account on the Profile tab", () => {
    signInAs();
    renderModal();

    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument();
    expect(screen.getByText('Manage your account info.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Profile details' })).toBeInTheDocument();
    expect(screen.getByText('Test Person')).toBeInTheDocument();
    expect(screen.getByText('GitHub • test.person@example.com')).toBeInTheDocument();
    expect(screen.getByText('+ Connect account')).toBeInTheDocument();
  });

  it('says plainly that it is a preview and saves nothing', () => {
    signInAs();
    renderModal();
    expect(screen.getByRole('note')).toHaveTextContent(/not connected to Clerk/);
  });

  it('never shows an IP address or a place, because the fallback cannot know either', async () => {
    const user = userEvent.setup();
    signInAs();
    renderModal();
    await user.click(screen.getByRole('button', { name: 'Security' }));
    expect(document.body.textContent).not.toMatch(/\b\d{1,3}(?:\.\d{1,3}){3}\b/);
    expect(screen.queryByText(/\([A-Z][\w .]+, [A-Z][\w .]+\)/)).not.toBeInTheDocument();
  });

  it("shows only the signed-in person's own name, never a built-in one", () => {
    signInAs({ ...USER, name: 'Someone Else', email: 'someone.else@example.com' });
    renderModal();
    expect(screen.getByText('Someone Else')).toBeInTheDocument();
    expect(screen.getByText('GitHub • someone.else@example.com')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Test Person');
  });

  it('offers the other provider to connect, not the one already connected', async () => {
    const user = userEvent.setup();
    signInAs();
    renderModal();
    await user.click(screen.getByText('+ Connect account'));
    expect(screen.getByRole('button', { name: 'Google' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'GitHub' })).not.toBeInTheDocument();
  });

  it('removes the connected account from the list', async () => {
    const user = userEvent.setup();
    signInAs();
    renderModal();
    await user.click(screen.getByRole('button', { name: 'Account options' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.queryByText(/GitHub •/)).not.toBeInTheDocument();
  });

  it('opens Update profile with the real name, and Cancel closes it', async () => {
    const user = userEvent.setup();
    signInAs();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Update profile' }));
    expect(screen.getByText('Recommended size 1:1, up to 10MB.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Person')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Recommended size 1:1, up to 10MB.')).not.toBeInTheDocument();
  });

  it("shows this browser's real device on the Security tab", async () => {
    const user = userEvent.setup();
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(CHROME_WINDOWS);
    signInAs();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Security' }));
    expect(screen.getByRole('heading', { name: 'Security' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set password' })).toBeInTheDocument();
    expect(screen.getByText('Windows')).toBeInTheDocument();
    expect(screen.getByText('This device')).toBeInTheDocument();
    expect(screen.getByText('Chrome 154.0.0.0')).toBeInTheDocument();
    expect(screen.getByText(/^Today at /)).toBeInTheDocument();
  });

  it('rejects a short password and a mismatched confirmation', async () => {
    const user = userEvent.setup();
    signInAs();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Security' }));
    await user.click(screen.getByRole('button', { name: 'Set password' }));
    expect(screen.getByText('Sign out of all other devices')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Your password must contain 8 or more characters.')).toBeInTheDocument();

    const [newPassword, confirmPassword] = screen.getAllByLabelText(/password/i, { selector: 'input' });
    await user.type(newPassword!, 'long-enough-1');
    await user.type(confirmPassword!, 'something-else-2');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
  });
});
