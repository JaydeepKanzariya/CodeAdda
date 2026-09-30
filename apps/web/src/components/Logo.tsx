import { cx } from '../lib/cx';

/** CodeAdda mark: a chat bubble (the "adda") holding </>. Same geometry as public/favicon.svg. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cx('shrink-0', className)}>
      <rect x="4" y="5" width="56" height="44" rx="14" className="fill-brand" />
      <polygon points="14,43 31,43 11,60" className="fill-brand" />
      <g fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22,19 14,27 22,35" />
        <polyline points="42,19 50,27 42,35" />
        <line x1="35" y1="16" x2="29" y2="38" />
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx('flex items-center gap-2', className)}>
      <LogoMark className="size-8" />
      <span className="hidden text-lg font-bold tracking-tight sm:inline">
        <span className="text-ink">Code</span>
        <span className="text-brand">Adda</span>
      </span>
    </span>
  );
}
