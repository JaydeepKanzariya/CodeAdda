// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFirstLoad } from './useFirstLoad';

type Status = 'idle' | 'loading' | 'ready' | 'error';
const setup = (initial: Status) => renderHook(({ s }) => useFirstLoad(s), { initialProps: { s: initial } });

describe('useFirstLoad', () => {
  it('shows the page loader while the first load is running', () => {
    expect(setup('loading').result.current).toBe(true);
  });
  it('does not show it when ready, idle or errored', () => {
    expect(setup('ready').result.current).toBe(false);
    expect(setup('idle').result.current).toBe(false);
    expect(setup('error').result.current).toBe(false);
  });
  it('stops showing it once ready, even if loading starts again', () => {
    const { result, rerender } = setup('loading');
    expect(result.current).toBe(true);
    rerender({ s: 'ready' });
    expect(result.current).toBe(false);
    rerender({ s: 'loading' });
    expect(result.current).toBe(false);
  });
  it('stops showing it after an error, so the error screen can appear', () => {
    const { result, rerender } = setup('loading');
    rerender({ s: 'error' });
    expect(result.current).toBe(false);
    rerender({ s: 'loading' });
    expect(result.current).toBe(false);
  });
});
