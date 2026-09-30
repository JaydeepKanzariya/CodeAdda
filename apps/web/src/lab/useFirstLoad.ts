import { useState } from 'react';

/** True only while the very first database load is running; once it has settled it never returns true again. */
export function useFirstLoad(status: 'idle' | 'loading' | 'ready' | 'error'): boolean {
  const [settled, setSettled] = useState(status === 'ready' || status === 'error');
  if (!settled && (status === 'ready' || status === 'error')) setSettled(true);
  return !settled && status === 'loading';
}
