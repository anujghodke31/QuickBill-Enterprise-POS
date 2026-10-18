import { CircleCheck, Printer } from 'lucide-react';
import { Dialog as D } from 'radix-ui';
import type { SaleDTO } from '@quickbill/shared';
import { Button } from '@/components/ui/button';
import { openFile } from '@/lib/api';
import { formatINR, label } from '@/lib/format';

/** Shown after a successful charge: the bill "prints" out of the till. */
export function SaleComplete({ sale, onClose }: { sale: SaleDTO | null; onClose: () => void }) {
  return (
    <D.Root open={!!sale} onOpenChange={(open) => !open && onClose()}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-fade-in" />
        <D.Content className="fixed top-[8vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 focus:outline-none">
          {sale && (
            <>
              <div className="receipt animate-print px-6 font-mono text-[13px] shadow-float">
                <D.Title className="flex items-center justify-center gap-2 font-sans text-lg font-semibold text-leaf-700">
                  <CircleCheck className="size-5" /> Paid
                </D.Title>
                <D.Description className="text-center text-ink-faint">
                  Bill {sale.number}, {label(sale.paymentMethod)}
                </D.Description>
                <div className="receipt-rule my-3" />
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {sale.items.map((i) => (
                    <li key={i.id} className="flex justify-between gap-3">
                      <span className="truncate">
                        {i.quantity} × {i.name}
                      </span>
                      <span className="tabular-nums">{formatINR(i.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
                <div className="receipt-rule my-3" />
                {sale.discount > 0 && (
                  <p className="flex justify-between text-leaf-700">
                    <span>Points redeemed</span>
                    <span>− {formatINR(sale.discount)}</span>
                  </p>
                )}
                <p className="flex items-baseline justify-between text-base font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{formatINR(sale.total)}</span>
                </p>
                {sale.changeDue !== null && (
                  <div className="mt-3 rounded-lg bg-turmeric-100 px-3 py-2 text-center font-sans">
                    <p className="text-sm text-turmeric-800">Give back</p>
                    <p className="type-display text-4xl text-ink tabular-nums">
                      {formatINR(sale.changeDue)}
                    </p>
                  </div>
                )}
                {sale.customer && (
                  <p className="mt-3 text-center text-ink-soft">
                    {sale.customer.name} earned {sale.pointsEarned} points
                  </p>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1 bg-surface"
                  onClick={() => void openFile(`/sales/${sale.id}/receipt.pdf`)}
                >
                  <Printer /> Print receipt
                </Button>
                <Button className="flex-1" onClick={onClose} autoFocus>
                  Start next bill
                </Button>
              </div>
            </>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
