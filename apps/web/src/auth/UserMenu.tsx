import { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { SecuredByClerk } from './ClerkBrand';
import { AccountModal } from './AccountModal';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="User account menu"
          className="flex size-9 items-center justify-center rounded-full border border-line bg-surface font-mono text-xs font-semibold text-brand shadow-soft transition-transform hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-brand"
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="size-full rounded-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center rounded-full bg-emerald-100 font-mono text-xs font-bold text-emerald-800">
              {initials}
            </div>
          )}
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-line bg-surface p-2 shadow-float animate-pop z-[1100]"
          >
            {/* User details header */}
            <div className="flex items-center gap-3 border-b border-line px-3 py-3">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="size-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-mono text-sm font-bold text-emerald-800">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            </div>

            {/* Menu options */}
            <div className="py-1">
              {/* Manage account */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setAccountModalOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-normal text-ink transition-colors hover:bg-hover"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="size-4.5 text-muted shrink-0" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Manage account</span>
              </button>

              {/* Sign out */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-normal text-ink transition-colors hover:bg-hover"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="size-4.5 text-muted shrink-0" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Sign out</span>
              </button>
            </div>

            {/* Secured by Clerk */}
            <div className="border-t border-line py-2.5">
              <SecuredByClerk />
            </div>
          </div>
        )}
      </div>

      {/* Account Profile and Security Modal */}
      <AccountModal isOpen={accountModalOpen} onClose={() => setAccountModalOpen(false)} />
    </>
  );
}
