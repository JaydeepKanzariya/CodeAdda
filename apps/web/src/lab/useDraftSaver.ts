import { useEffect, useRef } from 'react';

/**
 * Debounced draft saving. A save still pending when the component unmounts (e.g. the learner
 * moves to another lesson within the delay) is flushed instead of being dropped.
 */
export function useDraftSaver(save: (value: string) => void, value: string, delayMs = 400): void {
  const saveRef = useRef(save);
  const pending = useRef<{ value: string } | null>(null);

  useEffect(() => {
    saveRef.current = save;
  });

  useEffect(() => {
    pending.current = { value };
    const t = setTimeout(() => {
      pending.current = null;
      saveRef.current(value);
    }, delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  useEffect(
    () => () => {
      const p = pending.current;
      pending.current = null;
      if (p) saveRef.current(p.value);
    },
    [],
  );
}
