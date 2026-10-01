import { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { labs, upcomingLabs } from '../content/registry';
import { cx } from '../lib/cx';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

// Below md the strip swipes sideways: smaller links, no scrollbar, and a fade on the right edge
// (pr-6 matches the fade width, so the last link can scroll fully clear of it).
const LINK = 'whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium md:px-3 md:text-sm';

export function Navbar() {
  const strip = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  // Keep the current lab visible inside the strip after navigating (no-op where unsupported, e.g. jsdom).
  useEffect(() => {
    strip.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [pathname]);

  return (
    <header className="sticky top-0 z-[1000] h-(--navbar-height) border-b border-line bg-surface">
      <nav aria-label="Labs" className="mx-auto flex h-full max-w-360 items-center gap-3 px-4 md:gap-4 md:px-6">
        <Link to="/" aria-label="CodeAdda home" className="shrink-0">
          <Logo />
        </Link>
        <div ref={strip} data-testid="lab-links" className="no-scrollbar mx-auto flex min-w-0 items-center gap-1 overflow-x-auto max-md:fade-end max-md:pr-6">
          {labs.map((lab) => (
            <NavLink
              key={lab.id}
              to={`/${lab.id}`}
              className={({ isActive }) => cx(LINK, 'transition-colors', isActive ? 'bg-brand-muted text-brand' : 'text-muted hover:bg-hover hover:text-ink')}
            >
              {lab.title}
            </NavLink>
          ))}
          {upcomingLabs().map((u) => (
            <span key={u} aria-disabled="true" title="Coming soon" className={cx(LINK, 'cursor-default text-faint')}>
              {u}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <span aria-hidden="true" className="hidden size-7 rounded-full bg-[conic-gradient(var(--color-accent),var(--color-info),var(--color-success),var(--color-accent))] opacity-70 md:block" />
        </div>
      </nav>
    </header>
  );
}
