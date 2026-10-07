import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { GitHubIcon, GoogleIcon } from './ClerkBrand';
import { describeUserAgent, formatLastActive, initialsOf, splitName } from './accountFormat';

const PROVIDER_NAME = { github: 'GitHub', google: 'Google' } as const;
const ProviderIcon = { github: GitHubIcon, google: GoogleIcon } as const;

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Profile edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [firstName, setFirstName] = useState(() => splitName(user?.name ?? '').firstName);
  const [lastName, setLastName] = useState(() => splitName(user?.name ?? '').lastName);

  // Connected accounts menu states
  const [showConnectMenu, setShowConnectMenu] = useState(false);
  const [showAccountOptions, setShowAccountOptions] = useState(false);
  const [providerConnected, setProviderConnected] = useState(true);

  // Security password states
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signOutOtherDevices, setSignOutOtherDevices] = useState(true);
  const [passwordError, setPasswordError] = useState('');

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const handleSavePassword = () => {
    if (newPassword.length < 8) {
      setPasswordError('Your password must contain 8 or more characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordError('');
    setIsSettingPassword(false);
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSaveProfile = () => {
    setIsEditingProfile(false);
  };

  const initials = initialsOf(`${firstName} ${lastName}`);
  const otherProvider = user.provider === 'github' ? 'google' : 'github';
  const ConnectedIcon = ProviderIcon[user.provider];
  const OtherIcon = ProviderIcon[otherProvider];
  // The real browser and time, never made-up values; the development fallback cannot know an IP or place.
  const { os, browser } = describeUserAgent(typeof navigator === 'undefined' ? '' : navigator.userAgent);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-rise"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Account Dialog Card */}
      <div className="relative flex h-[580px] max-h-[92vh] w-full max-w-[820px] overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-float animate-pop">
        {/* Close Button at top-right */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-5 top-5 z-20 rounded-lg p-1.5 text-muted transition-colors hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Left Sidebar Navigation */}
        <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-subtle/30 p-6">
          <div>
            <h2 id="account-modal-title" className="text-xl font-bold tracking-tight text-ink">
              Account
            </h2>
            <p className="mt-0.5 text-xs text-muted">Manage your account info.</p>
          </div>

          <nav className="mt-6 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'bg-hover text-ink shadow-2xs'
                  : 'text-muted hover:bg-hover/60 hover:text-ink'
              }`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Profile</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'security'
                  ? 'bg-hover text-ink shadow-2xs'
                  : 'text-muted hover:bg-hover/60 hover:text-ink'
              }`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Security</span>
            </button>
          </nav>
        </aside>

        {/* Right Content Area */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          <p role="note" className="mb-5 rounded-lg border border-warn-line bg-warn-bg px-3 py-2 pr-10 text-xs text-warn">
            Development preview. This screen is not connected to Clerk, so nothing here is saved. With a Clerk key,
            Clerk&apos;s own account screens are used instead.
          </p>
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="border-b border-line pb-4">
                <h3 className="text-base font-bold text-ink">Profile details</h3>
              </div>

              {/* Profile Details Section */}
              <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-start">
                <span className="w-44 shrink-0 text-sm font-medium text-ink">Profile</span>

                <div className="flex-1">
                  {!isEditingProfile ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {user?.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.name} className="size-11 rounded-full object-cover" />
                        ) : (
                          <div className="flex size-11 items-center justify-center rounded-full bg-emerald-100 font-mono text-sm font-bold text-emerald-800">
                            {initials}
                          </div>
                        )}
                        <span className="text-sm font-medium text-ink">{`${firstName} ${lastName}`}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(true)}
                        className="rounded-md px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-hover"
                      >
                        Update profile
                      </button>
                    </div>
                  ) : (
                    /* Update Profile Expandable Card */
                    <div className="rounded-xl border border-line bg-surface p-5 shadow-soft">
                      <h4 className="text-sm font-semibold text-ink">Update profile</h4>

                      {/* Avatar Upload */}
                      <div className="mt-4 flex items-center gap-4">
                        <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 font-mono text-base font-bold text-emerald-800">
                          {initials}
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-2xs hover:bg-hover"
                          >
                            Upload
                          </button>
                          <button
                            type="button"
                            className="text-xs font-medium text-bad hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-[11px] text-muted">Recommended size 1:1, up to 10MB.</p>

                      {/* Name Inputs */}
                      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="account-first-name" className="block text-xs font-medium text-muted">First name</label>
                          <input
                            id="account-first-name"
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand"
                          />
                        </div>
                        <div>
                          <label htmlFor="account-last-name" className="block text-xs font-medium text-muted">Last name</label>
                          <input
                            id="account-last-name"
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand"
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-6 flex justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:bg-hover hover:text-ink"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveProfile}
                          className="rounded-lg bg-neutral-700 px-4 py-1.5 text-xs font-medium text-white shadow-2xs hover:bg-neutral-800"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Connected Accounts Section */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <span className="w-44 shrink-0 text-sm font-medium text-ink">Connected accounts</span>

                <div className="flex-1 space-y-3">
                  {providerConnected && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-sm font-medium text-ink">
                        <ConnectedIcon className="size-4.5" />
                        <span>{`${PROVIDER_NAME[user.provider]} • ${user.email}`}</span>
                      </div>

                      {/* Options menu (...) */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowAccountOptions((p) => !p)}
                          className="rounded-md p-1.5 text-muted hover:bg-hover hover:text-ink"
                          aria-label="Account options"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
                            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                          </svg>
                        </button>

                        {showAccountOptions && (
                          <div className="absolute right-0 top-full mt-1 w-28 rounded-xl border border-line bg-surface p-1 shadow-raised z-30">
                            <button
                              type="button"
                              onClick={() => {
                                setProviderConnected(false);
                                setShowAccountOptions(false);
                              }}
                              className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-bad hover:bg-bad-bg/50"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Connect account dropdown */}
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => setShowConnectMenu((p) => !p)}
                      className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
                    >
                      <span>+ Connect account</span>
                    </button>

                    {showConnectMenu && (
                      <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-line bg-surface p-1.5 shadow-raised z-30">
                        <button
                          type="button"
                          onClick={() => setShowConnectMenu(false)}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-ink hover:bg-hover"
                        >
                          <OtherIcon className="size-4" />
                          <span>{PROVIDER_NAME[otherProvider]}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="border-b border-line pb-4">
                <h3 className="text-base font-bold text-ink">Security</h3>
              </div>

              {/* Password Section */}
              <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-start">
                <span className="w-44 shrink-0 text-sm font-medium text-ink">Password</span>

                <div className="flex-1">
                  {!isSettingPassword ? (
                    <button
                      type="button"
                      onClick={() => setIsSettingPassword(true)}
                      className="text-sm font-medium text-muted hover:text-ink"
                    >
                      Set password
                    </button>
                  ) : (
                    /* Set Password Expandable Card */
                    <div className="rounded-xl border border-line bg-surface p-5 shadow-soft">
                      <h4 className="text-sm font-semibold text-ink">Set password</h4>

                      <div className="mt-4 space-y-3.5">
                        {/* New Password */}
                        <div>
                          <label htmlFor="account-new-password" className="block text-xs font-medium text-muted">New password</label>
                          <div className="relative mt-1.5">
                            <input
                              id="account-new-password"
                              type={showNewPassword ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(e) => {
                                setNewPassword(e.target.value);
                                setPasswordError('');
                              }}
                              className={`w-full rounded-lg border bg-surface px-3 py-2 pr-10 text-sm text-ink outline-none transition-colors ${
                                passwordError ? 'border-bad' : 'border-line focus:border-brand'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword((p) => !p)}
                              className="absolute right-3 top-2.5 text-muted hover:text-ink"
                              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor" className="size-4.5">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path
                                  fillRule="evenodd"
                                  d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          </div>
                          {passwordError && (
                            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-bad">
                              <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5 shrink-0">
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span>{passwordError}</span>
                            </p>
                          )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                          <label htmlFor="account-confirm-password" className="block text-xs font-medium text-muted">Confirm password</label>
                          <div className="relative mt-1.5">
                            <input
                              id="account-confirm-password"
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full rounded-lg border border-line bg-surface px-3 py-2 pr-10 text-sm text-ink outline-none transition-colors focus:border-brand"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword((p) => !p)}
                              className="absolute right-3 top-2.5 text-muted hover:text-ink"
                              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor" className="size-4.5">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path
                                  fillRule="evenodd"
                                  d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Sign out other devices checkbox */}
                        <div className="mt-3 flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            id="sign-out-other"
                            checked={signOutOtherDevices}
                            onChange={(e) => setSignOutOtherDevices(e.target.checked)}
                            className="mt-0.5 size-4 rounded border-line text-brand accent-brand"
                          />
                          <div>
                            <label htmlFor="sign-out-other" className="text-xs font-semibold text-ink">
                              Sign out of all other devices
                            </label>
                            <p className="mt-0.5 text-[11px] text-muted">
                              It is recommended to sign out of all other devices which may have used your old password.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-6 flex justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsSettingPassword(false);
                            setPasswordError('');
                          }}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:bg-hover hover:text-ink"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSavePassword}
                          className="rounded-lg bg-neutral-700 px-4 py-1.5 text-xs font-medium text-white shadow-2xs hover:bg-neutral-800"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Devices Section */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <span className="w-44 shrink-0 text-sm font-medium text-ink">Active devices</span>

                <div className="flex items-start gap-3.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-subtle text-ink">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{os}</span>
                      <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-medium text-muted">
                        This device
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{browser}</p>
                    <p className="text-xs text-muted">{formatLastActive(new Date())}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

