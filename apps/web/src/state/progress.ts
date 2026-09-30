import { useSyncExternalStore } from 'react';
import { safeLocalStorage, type KeyValue } from './storage';

export interface ProgressStore {
  isComplete(labId: string, itemId: string): boolean;
  markComplete(labId: string, itemId: string): void;
  completedCount(labId: string): number;
  getDraft(labId: string, itemId: string): string | undefined;
  saveDraft(labId: string, itemId: string, query: string): void;
  subscribe(fn: () => void): () => void;
  version(): number;
}

interface LabProgress {
  done: string[];
  drafts: Record<string, string>;
}

const KEY = 'codeadda:progress:v1';
/** Key used before the CodeAdda rename; read once so completed lessons and drafts carry over. */
const LEGACY_KEY = 'dblabs:progress:v1';

export function createProgressStore(kv: KeyValue): ProgressStore {
  let data: Record<string, LabProgress> = {};
  try {
    const parsed: unknown = JSON.parse(kv.get(KEY) ?? kv.get(LEGACY_KEY) ?? '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed as Record<string, LabProgress>;
  } catch {
    data = {};
  }
  let version = 0;
  const listeners = new Set<() => void>();

  const lab = (id: string): LabProgress => {
    const e = (data[id] ??= { done: [], drafts: {} });
    if (!Array.isArray(e.done)) e.done = [];
    if (!e.drafts || typeof e.drafts !== 'object') e.drafts = {};
    return e;
  };
  const save = (notify: boolean) => {
    try {
      kv.set(KEY, JSON.stringify(data));
    } catch {
      // keep in memory
    }
    if (notify) {
      version++;
      listeners.forEach((l) => l());
    }
  };

  return {
    isComplete: (l, i) => lab(l).done.includes(i),
    markComplete(l, i) {
      const e = lab(l);
      if (e.done.includes(i)) return;
      e.done.push(i);
      save(true);
    },
    completedCount: (l) => lab(l).done.length,
    getDraft: (l, i) => lab(l).drafts[i],
    saveDraft(l, i, q) {
      lab(l).drafts[i] = q;
      save(false);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    version: () => version,
  };
}

export const progressStore = createProgressStore(safeLocalStorage());

export function useProgress(store: ProgressStore = progressStore): ProgressStore {
  useSyncExternalStore(store.subscribe, store.version);
  return store;
}
