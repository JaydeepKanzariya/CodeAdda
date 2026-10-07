import { cx } from '../lib/cx';

export function ClerkLogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={cx('size-4', className)}>
      <path d="M11.53 2C6.27 2 2 6.27 2 11.53s4.27 9.53 9.53 9.53c4.11 0 7.62-2.6 8.97-6.27h-3.41c-1.1 2.05-3.23 3.47-5.56 3.47-3.71 0-6.73-3.02-6.73-6.73s3.02-6.73 6.73-6.73c2.33 0 4.46 1.42 5.56 3.47h3.41C19.15 4.6 15.64 2 11.53 2z" />
      <circle cx="11.53" cy="11.53" r="2.8" />
    </svg>
  );
}

export function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={cx('size-5', className)}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx('size-5', className)}>
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.27-2.09 3.675-5.17 3.675-9.15z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.25v3.13C3.26 21.3 7.36 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.24c-.25-.72-.39-1.49-.39-2.24s.14-1.52.39-2.24V6.63H1.25C.45 8.24 0 10.06 0 12s.45 3.76 1.25 5.37l4.02-3.13z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.7 1.25 6.63l4.02 3.13c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

export function SecuredByClerk() {
  return (
    <div className="flex items-center justify-center gap-1.5 text-xs font-normal text-muted">
      <span>Secured by</span>
      <span className="inline-flex items-center gap-1 font-semibold text-ink">
        <ClerkLogoMark className="size-3.5 text-ink" />
        clerk
      </span>
    </div>
  );
}
