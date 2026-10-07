export function splitName(name: string): { firstName: string; lastName: string } {
  const [firstName = '', ...rest] = name.trim().split(/\s+/);
  return { firstName, lastName: rest.join(' ') };
}

export function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
  return letters || '?';
}

/** Reads the browser's own user agent, so the "This device" line shows the real device, never a made-up one. */
export function describeUserAgent(ua: string): { os: string; browser: string } {
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad|iPod/.test(ua)
        ? 'iOS'
        : /Mac OS X|Macintosh/.test(ua)
          ? 'macOS'
          : /CrOS/.test(ua)
            ? 'ChromeOS'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'Unknown device';
  const named = (name: string, pattern: RegExp) => {
    const match = pattern.exec(ua);
    return match ? `${name} ${match[1]}` : null;
  };
  // Order matters: Edge, Opera and Chrome all contain "Chrome" or "Safari" in their user agent.
  const browser =
    named('Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/) ??
    named('Opera', /OPR\/([\d.]+)/) ??
    named('Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/) ??
    named('Chrome', /(?:Chrome|CriOS)\/([\d.]+)/) ??
    named('Safari', /Version\/([\d.]+).*Safari/) ??
    'Unknown browser';
  return { os, browser };
}

/** "Today at 5:19 PM", "Yesterday at …", or "Oct 3, 2026 at …". */
export function formatLastActive(date: Date, now: Date = new Date(), locale?: string): string {
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((dayStart(now) - dayStart(date)) / 86_400_000);
  if (days === 0) return `Today at ${time}`;
  if (days === 1) return `Yesterday at ${time}`;
  return `${new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)} at ${time}`;
}
