import { useEffect, useRef, useState } from 'react';
import type { SaleDTO } from '@quickbill/shared';
import { Kbd } from '@/components/ui/display';
import { useDocumentTitle } from '@/lib/hooks';
import { BillPanel } from './bill-panel';
import { ProductBrowser } from './product-browser';
import { SaleComplete } from './sale-complete';

export default function PosPage() {
  useDocumentTitle('Point of sale');
  const searchRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const [completed, setCompleted] = useState<SaleDTO | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        phoneRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-3.5rem)] lg:flex-row">
      <section
        className="flex min-h-[60dvh] min-w-0 flex-1 flex-col lg:min-h-0"
        aria-label="Products"
      >
        <ProductBrowser searchRef={searchRef} />
        <p className="hidden items-center gap-4 border-t border-line px-6 py-2 text-xs text-ink-faint lg:flex">
          <span className="flex items-center gap-1.5">
            <Kbd>F2</Kbd> Find product
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>F4</Kbd> Customer
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>F9</Kbd> Charge
          </span>
          <span className="ml-auto">Barcode scanners work anywhere on this screen.</span>
        </p>
      </section>
      <aside
        className="flex min-h-0 w-full flex-col border-t border-line bg-[#eceef2] lg:w-[420px] lg:border-t-0 lg:border-l"
        aria-label="Current bill"
      >
        <BillPanel phoneRef={phoneRef} onComplete={setCompleted} />
      </aside>
      <SaleComplete
        sale={completed}
        onClose={() => {
          setCompleted(null);
          setTimeout(() => searchRef.current?.focus(), 0);
        }}
      />
    </div>
  );
}
