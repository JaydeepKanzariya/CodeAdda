import { describe, expect, it, vi } from 'vitest';
import { createProgressStore } from './progress';
import { memoryStorage } from './storage';

describe('progress store', () => {
  it('marks items complete, persists and notifies', () => {
    const kv = memoryStorage();
    const store = createProgressStore(kv);
    const listener = vi.fn();
    store.subscribe(listener);
    store.markComplete('sql', 'select-all');
    store.markComplete('sql', 'select-all');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.version()).toBe(1);
    const again = createProgressStore(kv);
    expect(again.isComplete('sql', 'select-all')).toBe(true);
    expect(again.isComplete('sql', 'other')).toBe(false);
    expect(again.completedCount('sql')).toBe(1);
  });

  it('saves drafts without notifying', () => {
    const kv = memoryStorage();
    const store = createProgressStore(kv);
    const listener = vi.fn();
    store.subscribe(listener);
    store.saveDraft('sql', 'a', 'SELECT 1;');
    expect(listener).not.toHaveBeenCalled();
    expect(createProgressStore(kv).getDraft('sql', 'a')).toBe('SELECT 1;');
  });

  it('carries over progress saved under the pre-rename dblabs key and saves to the new key', () => {
    const kv = memoryStorage();
    kv.set('dblabs:progress:v1', '{"sql":{"done":["select-all"],"drafts":{"a":"SELECT 1;"}}}');
    const store = createProgressStore(kv);
    expect(store.isComplete('sql', 'select-all')).toBe(true);
    expect(store.getDraft('sql', 'a')).toBe('SELECT 1;');
    store.markComplete('sql', 'b');
    expect(kv.get('codeadda:progress:v1')).toContain('"select-all"');
  });

  it('starts empty when stored data is broken', () => {
    const kv = memoryStorage();
    kv.set('codeadda:progress:v1', '[1,2');
    expect(createProgressStore(kv).completedCount('sql')).toBe(0);
    kv.set('codeadda:progress:v1', '{"sql":{"done":"nope"}}');
    const store = createProgressStore(kv);
    store.markComplete('sql', 'a');
    expect(store.isComplete('sql', 'a')).toBe(true);
  });
});
