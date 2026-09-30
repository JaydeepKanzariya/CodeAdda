import { prefsStore, usePrefs } from '../state/prefs';

export function ThemeToggle() {
  const { theme } = usePrefs();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={() => prefsStore.set({ theme: next })}
      aria-label={`Switch to ${next} mode`}
      className="grid size-9 place-items-center rounded-md border border-line bg-surface text-muted shadow-soft transition-colors hover:bg-hover hover:text-ink"
    >
      <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {theme === 'dark' ? (
          <>
            <circle cx="8" cy="8" r="3" />
            <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" />
          </>
        ) : (
          <path d="M13.5 9.5A5.5 5.5 0 1 1 6.5 2.5a4.5 4.5 0 0 0 7 7z" />
        )}
      </svg>
    </button>
  );
}
