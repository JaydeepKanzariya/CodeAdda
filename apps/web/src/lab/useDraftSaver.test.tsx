// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDraftSaver } from './useDraftSaver';

describe('useDraftSaver', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('saves the latest value after the debounce delay', () => {
    const save = vi.fn();
    const { rerender } = renderHook(({ q }) => useDraftSaver(save, q, 400), { initialProps: { q: 'a' } });
    rerender({ q: 'ab' });
    vi.advanceTimersByTime(399);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenLastCalledWith('ab');
  });

  it('flushes a pending save on unmount instead of dropping it', () => {
    const save = vi.fn();
    const { rerender, unmount } = renderHook(({ q }) => useDraftSaver(save, q, 400), { initialProps: { q: 'a' } });
    vi.advanceTimersByTime(400);
    save.mockClear();
    rerender({ q: 'SELECT 1' });
    vi.advanceTimersByTime(100);
    unmount();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenLastCalledWith('SELECT 1');
    vi.advanceTimersByTime(1000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('does not save again on unmount when nothing is pending', () => {
    const save = vi.fn();
    const { unmount } = renderHook(() => useDraftSaver(save, 'a', 400));
    vi.advanceTimersByTime(400);
    unmount();
    expect(save).toHaveBeenCalledTimes(1);
  });
});
