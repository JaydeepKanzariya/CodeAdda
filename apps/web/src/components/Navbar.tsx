import { Link, NavLink } from 'react-router';
import { labs } from '../content/registry';
import { cx } from '../lib/cx';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

const UPCOMING = ['PostgreSQL', 'MongoDB', 'Redis'];

export function Navbar() {
  return (
    <header className="sticky top-0 z-[1000] h-(--navbar-height) border-b border-line bg-surface">
      <nav aria-label="Labs" className="mx-auto flex h-full max-w-360 items-center gap-4 px-6">
        <Link to="/" aria-label="CodeAdda home" className="shrink-0">
          <Logo />
        </Link>
        <div className="mx-auto flex min-w-0 items-center gap-1 overflow-x-auto">
          {labs.map((lab) => (
            <NavLink
              key={lab.id}
              to={`/${lab.id}`}
              className={({ isActive }) =>
                cx('whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors', isActive ? 'bg-brand-muted text-brand' : 'text-muted hover:bg-hover hover:text-ink')
              }
            >
              {lab.title}
            </NavLink>
          ))}
          {UPCOMING.filter((u) => !labs.some((l) => l.title.startsWith(u))).map((u) => (
            <span key={u} aria-disabled="true" title="Coming soon" className="cursor-default whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-faint">
              {u}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <span aria-hidden="true" className="size-7 rounded-full bg-[conic-gradient(var(--color-accent),var(--color-info),var(--color-success),var(--color-accent))] opacity-70" />
        </div>
      </nav>
    </header>
  );
}
