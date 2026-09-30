import { Separator } from 'react-resizable-panels';
import { cx } from '../lib/cx';

/**
 * A drag handle between two panels. `orientation` is the orientation of the parent group:
 * 'horizontal' (side-by-side columns, a vertical bar) or 'vertical' (stacked rows, a horizontal bar).
 * The library sets `data-separator` to inactive | hover | active | focus | disabled, and gives the
 * element role="separator" with arrow-key resizing.
 */
export function ResizeHandle({ orientation, label }: { orientation: 'horizontal' | 'vertical'; label: string }) {
  const columns = orientation === 'horizontal';
  return (
    <Separator
      aria-label={label}
      className={cx(
        'group relative flex items-center justify-center bg-page outline-none',
        columns ? 'w-3' : 'h-3',
        'focus-visible:bg-brand-muted',
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'rounded-full bg-line-strong transition-colors',
          'group-data-[separator=hover]:bg-brand group-data-[separator=active]:bg-brand group-data-[separator=focus]:bg-brand',
          columns ? 'h-8 w-[3px]' : 'h-[3px] w-8',
        )}
      />
    </Separator>
  );
}
