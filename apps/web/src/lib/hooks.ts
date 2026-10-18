import { useEffect, useState } from 'react';

export function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/** Runs `handler` for a keyboard shortcut such as "mod+k" or "F9". */
export function useHotkey(combo: string, handler: (e: KeyboardEvent) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const parts = combo.toLowerCase().split('+');
    const key = parts.pop()!;
    const needsMod = parts.includes('mod');
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key) return;
      if (needsMod !== (e.metaKey || e.ctrlKey)) return;
      handler(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [combo, handler, enabled]);
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | QuickBill`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
