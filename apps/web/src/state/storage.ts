export interface KeyValue {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export function memoryStorage(): KeyValue {
  const map = new Map<string, string>();
  return { get: (k) => map.get(k) ?? null, set: (k, v) => void map.set(k, v) };
}

/** localStorage when available; falls back to memory (private mode, blocked storage, tests). */
export function safeLocalStorage(): KeyValue {
  const mem = memoryStorage();
  return {
    get(k) {
      try {
        return window.localStorage.getItem(k);
      } catch {
        return mem.get(k);
      }
    },
    set(k, v) {
      try {
        window.localStorage.setItem(k, v);
      } catch {
        mem.set(k, v);
      }
    },
  };
}
