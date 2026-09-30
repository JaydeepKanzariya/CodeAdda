// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { memoryStorage } from './storage';
import { TEXT_AREAS, applyPrefs, clampSize, createPrefsStore, presetOf, type TextArea } from './prefs';

const all = (n: number) => Object.fromEntries(TEXT_AREAS.map((a) => [a, n])) as Record<TextArea, number>;

describe('prefs store', () => {
  it('defaults to the system theme and all text sizes 1', () => {
    const store = createPrefsStore(memoryStorage(), () => true);
    expect(store.get()).toEqual({ theme: 'dark', textSizes: all(1), sidebarCollapsed: false });
  });

  it('persists changes and notifies subscribers', () => {
    const kv = memoryStorage();
    const store = createPrefsStore(kv, () => false);
    const listener = vi.fn();
    store.subscribe(listener);
    store.set({ theme: 'dark' });
    store.setPreset('XL');
    expect(listener).toHaveBeenCalledTimes(2);
    expect(createPrefsStore(kv, () => false).get()).toMatchObject({ theme: 'dark', textSizes: all(1.25) });
  });

  it('ignores invalid stored values', () => {
    const kv = memoryStorage();
    kv.set('codeadda:prefs', '{"theme":"neon","fontScale":"x","sidebarCollapsed":"yes"}');
    expect(createPrefsStore(kv, () => false).get()).toEqual({ theme: 'light', textSizes: all(1), sidebarCollapsed: false });
    kv.set('codeadda:prefs', 'not json');
    expect(createPrefsStore(kv, () => false).get().theme).toBe('light');
  });

  it('migrates a legacy fontScale to all areas, clamped', () => {
    const kv = memoryStorage();
    kv.set('codeadda:prefs', '{"fontScale":1.25}');
    expect(createPrefsStore(kv, () => false).get().textSizes).toEqual(all(1.25));
    kv.set('codeadda:prefs', '{"fontScale":9}');
    expect(createPrefsStore(kv, () => false).get().textSizes).toEqual(all(1.5));
  });

  it('carries over settings saved under the pre-rename dblabs key, and prefers the new key', () => {
    const kv = memoryStorage();
    kv.set('dblabs:prefs', '{"theme":"dark","sidebarCollapsed":true}');
    expect(createPrefsStore(kv, () => false).get()).toMatchObject({ theme: 'dark', sidebarCollapsed: true });
    kv.set('codeadda:prefs', '{"theme":"light"}');
    expect(createPrefsStore(kv, () => false).get().theme).toBe('light');
  });

  it('sanitises corrupt textSizes', () => {
    const kv = memoryStorage();
    kv.set('codeadda:prefs', '{"textSizes":{"list":"x","content":null,"schema":0.1}}');
    expect(createPrefsStore(kv, () => false).get().textSizes).toEqual({
      list: 1, content: 1, schema: 0.75, editor: 1, results: 1,
    });
    expect(clampSize(NaN)).toBe(1);
  });

  it('setPreset, setTextSize and resetText', () => {
    const store = createPrefsStore(memoryStorage(), () => false);
    store.setPreset('XL');
    expect(store.get().textSizes).toEqual(all(1.25));
    expect(presetOf(store.get().textSizes)).toBe('XL');
    store.setTextSize('editor', 1.37);
    expect(store.get().textSizes.editor).toBe(1.35);
    expect(presetOf(store.get().textSizes)).toBeUndefined();
    store.resetText();
    expect(store.get().textSizes).toEqual(all(1));
    expect(presetOf(store.get().textSizes)).toBe('M');
  });

  it('keeps working in memory when localStorage throws', () => {
    const store = createPrefsStore(
      { get: () => { throw new Error('blocked'); }, set: () => { throw new Error('blocked'); } },
      () => false,
    );
    store.set({ theme: 'dark' });
    expect(store.get().theme).toBe('dark');
  });
});

describe('applyPrefs', () => {
  it('writes the theme and --fs-* variables and removes the legacy --font-scale', () => {
    const root = document.documentElement;
    root.style.setProperty('--font-scale', '1.2');
    applyPrefs({
      theme: 'dark',
      textSizes: { list: 0.9, content: 1.1, schema: 1.25, editor: 1.5, results: 0.75 },
      sidebarCollapsed: false,
    });
    expect(root.dataset.theme).toBe('dark');
    expect(root.style.getPropertyValue('--font-scale')).toBe('');
    expect(root.style.getPropertyValue('--fs-list')).toBe('0.9');
    expect(root.style.getPropertyValue('--fs-content')).toBe('1.1');
    expect(root.style.getPropertyValue('--fs-schema')).toBe('1.25');
    expect(root.style.getPropertyValue('--fs-results')).toBe('0.75');
  });
});
