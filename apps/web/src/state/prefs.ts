import { useSyncExternalStore } from 'react';
import { safeLocalStorage, type KeyValue } from './storage';

export type Theme = 'light' | 'dark';

export type TextArea = 'list' | 'content' | 'schema' | 'editor' | 'results';
export const TEXT_AREAS: readonly TextArea[] = ['list', 'content', 'schema', 'editor', 'results'];
export const TEXT_PRESETS = { S: 0.9, M: 1, L: 1.1, XL: 1.25 } as const;
export type TextPreset = keyof typeof TEXT_PRESETS;
export const TEXT_MIN = 0.75, TEXT_MAX = 1.5, TEXT_STEP = 0.05;

export interface Prefs {
  theme: Theme;
  textSizes: Record<TextArea, number>;
  sidebarCollapsed: boolean;
}

export function clampSize(n: unknown): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 1;
  const c = Math.min(TEXT_MAX, Math.max(TEXT_MIN, n));
  return Math.round(Math.round(c / TEXT_STEP) * TEXT_STEP * 100) / 100;
}

export function presetOf(sizes: Record<TextArea, number>): TextPreset | undefined {
  return (Object.keys(TEXT_PRESETS) as TextPreset[]).find((k) => TEXT_AREAS.every((a) => sizes[a] === TEXT_PRESETS[k]));
}

function uniform(n: number): Record<TextArea, number> {
  return { list: n, content: n, schema: n, editor: n, results: n };
}

function readSizes(raw: Record<string, unknown>): Record<TextArea, number> {
  const stored = raw.textSizes;
  if (stored && typeof stored === 'object') {
    const o = stored as Record<string, unknown>;
    return Object.fromEntries(TEXT_AREAS.map((a) => [a, clampSize(o[a])])) as Record<TextArea, number>;
  }
  return uniform(clampSize(raw.fontScale));
}

const KEY = 'codeadda:prefs';
/** Key used before the CodeAdda rename; read once so saved settings carry over. */
const LEGACY_KEY = 'dblabs:prefs';

function safeRead(kv: KeyValue): unknown {
  try {
    return JSON.parse(kv.get(KEY) ?? kv.get(LEGACY_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function createPrefsStore(kv: KeyValue, systemDark: () => boolean) {
  const raw = (safeRead(kv) ?? {}) as Record<string, unknown>;
  let prefs: Prefs = {
    theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : systemDark() ? 'dark' : 'light',
    textSizes: readSizes(raw),
    sidebarCollapsed: raw.sidebarCollapsed === true,
  };
  const listeners = new Set<() => void>();

  function set(patch: Partial<Prefs>) {
    prefs = { ...prefs, ...patch };
    try {
      kv.set(KEY, JSON.stringify(prefs));
    } catch {
      // storage unavailable: keep in memory only
    }
    listeners.forEach((l) => l());
  }

  return {
    get: (): Prefs => prefs,
    set,
    setTextSize(area: TextArea, n: number) {
      set({ textSizes: { ...prefs.textSizes, [area]: clampSize(n) } });
    },
    setPreset(p: TextPreset) {
      set({ textSizes: uniform(TEXT_PRESETS[p]) });
    },
    resetText() {
      set({ textSizes: uniform(1) });
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const prefsStore = createPrefsStore(
  safeLocalStorage(),
  () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches,
);

export function usePrefs(): Prefs {
  return useSyncExternalStore(prefsStore.subscribe, prefsStore.get);
}

export function applyPrefs(p: Prefs): void {
  document.documentElement.dataset.theme = p.theme;
  const root = document.documentElement;
  root.style.removeProperty('--font-scale');
  for (const a of ['list', 'content', 'schema', 'results'] as const) {
    root.style.setProperty(`--fs-${a}`, String(p.textSizes[a]));
  }
}
