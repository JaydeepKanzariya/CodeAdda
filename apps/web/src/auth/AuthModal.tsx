import { useEffect, useRef } from 'react';
import { LogoMark } from '../components/Logo';
import { GitHubIcon, GoogleIcon, SecuredByClerk } from './ClerkBrand';
import { useAuth } from './AuthProvider';

export function AuthModal() {
  const { isOpen, view, closeModal, setView, signInWithProvider, lastUsedProvider } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeModal]);

  // Prevent background scrolling while modal is open
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

  if (!isOpen) return null;

  const isSignIn = view === 'sign-in';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
    >
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-rise"
        onClick={closeModal}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div
        ref={cardRef}
        className="relative w-full max-w-[420px] rounded-2xl border border-line bg-surface p-6 shadow-float animate-pop sm:p-8"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={closeModal}
          aria-label="Close dialog"
          className="absolute top-4 right-4 rounded-lg p-1.5 text-muted transition-colors hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* CodeAdda Logo Header */}
        <div className="flex justify-center">
          <LogoMark className="size-14" />
        </div>

        {/* Title and Subtitle */}
        <div className="mt-3 text-center">
          <h2 id="auth-modal-title" className="text-xl font-bold tracking-tight text-ink">
            {isSignIn ? 'Sign in to CodeAdda' : 'Create your account'}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {isSignIn ? 'Welcome back! Please sign in to continue' : 'Welcome! Please fill in the details to get started.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          {/* Sign in mode: Stacked buttons with optional "Last used" pill */}
          {isSignIn ? (
            <>
              {/* GitHub Button */}
              <div className="relative">
                {lastUsedProvider === 'github' && (
                  <span className="absolute -top-2.5 right-4 z-10 rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-medium text-muted shadow-xs">
                    Last used
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => signInWithProvider('github')}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink shadow-soft transition-all hover:bg-hover active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <GitHubIcon className="size-5 shrink-0" />
                  <span>Continue with GitHub</span>
                </button>
              </div>

              {/* Google Button */}
              <div className="relative">
                {lastUsedProvider === 'google' && (
                  <span className="absolute -top-2.5 right-4 z-10 rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-medium text-muted shadow-xs">
                    Last used
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => signInWithProvider('google')}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink shadow-soft transition-all hover:bg-hover active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <GoogleIcon className="size-5 shrink-0" />
                  <span>Continue with Google</span>
                </button>
              </div>
            </>
          ) : (
            /* Sign up mode: Side-by-side or stacked buttons */
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => signInWithProvider('github')}
                className="flex flex-1 items-center justify-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink shadow-soft transition-all hover:bg-hover active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-brand"
              >
                <GitHubIcon className="size-5 shrink-0" />
                <span>GitHub</span>
              </button>
              <button
                type="button"
                onClick={() => signInWithProvider('google')}
                className="flex flex-1 items-center justify-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink shadow-soft transition-all hover:bg-hover active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-brand"
              >
                <GoogleIcon className="size-5 shrink-0" />
                <span>Google</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Area with Toggle Link and Secured by Clerk */}
        <div className="-mx-6 -mb-6 mt-8 rounded-b-2xl border-t border-line bg-subtle/40 px-6 py-5 text-center sm:-mx-8 sm:-mb-8 sm:px-8">
          <p className="text-sm text-muted">
            {isSignIn ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setView('sign-up')}
                  className="font-medium text-brand hover:underline focus-visible:outline-none"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setView('sign-in')}
                  className="font-medium text-brand hover:underline focus-visible:outline-none"
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          <div className="mt-4 pt-1">
            <SecuredByClerk />
          </div>
        </div>
      </div>
    </div>
  );
}
