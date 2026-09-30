import { cx } from '../lib/cx';
import { Chevron } from './Chevron';

export interface SidebarToggleProps {
  collapsed: boolean;
  onToggle: () => void;
  /** id of the sidebar this strip shows and hides. */
  controls: string;
}

/** Full-height desktop strip between the sidebar and the content: ‹ hides the lesson list, › shows it. */
export function SidebarToggle({ collapsed, onToggle, controls }: SidebarToggleProps) {
  const label = collapsed ? 'Show lesson list' : 'Hide lesson list';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      aria-expanded={!collapsed}
      aria-controls={controls}
      className={cx(
        'group hidden w-[18px] shrink-0 items-center justify-center self-stretch bg-page transition-colors hover:bg-brand-muted focus-visible:bg-brand-muted motion-reduce:transition-none lab:flex',
        !collapsed && 'border-l border-line',
      )}
    >
      <Chevron closed={collapsed} className={cx('text-faint transition-colors group-hover:text-brand group-focus-visible:text-brand', !collapsed && 'rotate-90')} />
    </button>
  );
}
