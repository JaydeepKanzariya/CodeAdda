import { useEffect, useState } from 'react';

/** Matches the Tailwind `lab` breakpoint (56.25rem = 900px). */
export const DESKTOP_QUERY = '(min-width: 56.25rem)';

/** True at or above the `lab` breakpoint; true when matchMedia is unavailable. */
export function useIsDesktop(): boolean {
  const get = () => typeof matchMedia !== 'function' || matchMedia(DESKTOP_QUERY).matches;
  const [desktop, setDesktop] = useState(get);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(DESKTOP_QUERY);
    const onChange = () => setDesktop(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return desktop;
}
