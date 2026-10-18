import { useEffect, useEffectEvent, useRef } from 'react';

/**
 * USB barcode scanners act as keyboards that type a code very quickly and press
 * Enter. This listens for that burst anywhere on the page (outside text fields,
 * which handle scans themselves) and reports the scanned code.
 */
export function useBarcodeScanner(onScan: (code: string) => void, enabled = true) {
  const buffer = useRef('');
  const lastKeyAt = useRef(0);
  const report = useEffectEvent(onScan);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      const now = performance.now();
      if (now - lastKeyAt.current > 50) buffer.current = '';
      lastKeyAt.current = now;

      if (e.key === 'Enter') {
        if (buffer.current.length >= 6) {
          e.preventDefault();
          report(buffer.current);
        }
        buffer.current = '';
      } else if (e.key.length === 1) {
        buffer.current += e.key;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
