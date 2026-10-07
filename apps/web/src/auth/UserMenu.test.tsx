// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from './AuthProvider';
import { UserMenu } from './UserMenu';

const USER = { id: 'usr_1', name: 'Test Person', email: 'test.person@example.com', provider: 'github' };

const renderMenu = () => {
  localStorage.setItem('codeadda:auth:user', JSON.stringify(USER));
  return render(
    <AuthProvider>
      <UserMenu />
    </AuthProvider>,
  );
};

describe('UserMenu (development fallback)', () => {
  afterEach(() => localStorage.clear());

  it("shows the signed-in person's own name and address, not made-up ones", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: 'User account menu' }));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Test Person')).toBeInTheDocument();
    expect(screen.getByText('test.person@example.com')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Manage account' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
    expect(screen.getByText(/Secured by/)).toBeInTheDocument();
  });

  it('opens the account screen from Manage account', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: 'User account menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Manage account' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument();
  });

  it('signs out', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: 'User account menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(screen.queryByRole('button', { name: 'User account menu' })).not.toBeInTheDocument();
    expect(localStorage.getItem('codeadda:auth:user')).toBeNull();
  });
});
