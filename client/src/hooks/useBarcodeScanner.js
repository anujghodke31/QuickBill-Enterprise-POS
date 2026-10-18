import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook to detect and capture Barcode Scanner HID inputs
 * @param {Function} onScan - Callback when a complete barcode is registered
 * @param {Object} options - Configuration for scanner
 */
export default function useBarcodeScanner(onScan, { delay = 50, requireActiveElement = false } = {}) {
    const buffer = useRef('');
    const lastKeyTime = useRef(Date.now());
    const timeout = useRef(null);

    const handleKeyDown = useCallback(
        (e) => {
            // Ignore if we shouldn't scan while user is typing in forms
            if (requireActiveElement && document.activeElement.tagName === 'INPUT') return;

            const currentTime = Date.now();
            
            // If chars are coming in faster than humanoid speed, it's a scanner
            if (currentTime - lastKeyTime.current > delay) {
                buffer.current = '';
            }

            // Enter key signifies end of scan
            if (e.key === 'Enter' && buffer.current.length > 3) {
                onScan(buffer.current);
                buffer.current = ''; // Flush
                e.preventDefault();
                return;
            }

            // Normal text character
            if (e.key.length === 1) {
                buffer.current += e.key;
            }

            lastKeyTime.current = currentTime;

            // Failsafe clearing
            if (timeout.current) clearTimeout(timeout.current);
            timeout.current = setTimeout(() => {
                buffer.current = '';
            }, delay + 50);
        },
        [onScan, delay, requireActiveElement]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (timeout.current) clearTimeout(timeout.current);
        };
    }, [handleKeyDown]);
}
