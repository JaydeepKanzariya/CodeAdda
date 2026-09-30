import { cx } from '../lib/cx';

/** A down chevron that sits on the text's centre line (the "⌄" glyph sits low). Rotate it with `closed`. */
export function Chevron({ closed, className }: { closed?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx('size-3 shrink-0 transition-transform motion-reduce:transition-none', closed && '-rotate-90', className)}
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}
