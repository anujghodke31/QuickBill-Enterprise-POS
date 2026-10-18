import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, CreditCard, Minus, Plus, Smartphone, Trash } from 'lucide-react';
import { useEffectEvent, useEffect, useMemo, type RefObject } from 'react';
import { toast } from 'sonner';
import {
  computeBillTotals,
  LOYALTY,
  type CheckoutInput,
  type PaymentMethod,
  type SaleDTO,
} from '@quickbill/shared';
import { Packshot } from '@/components/packshot';
import { Kbd } from '@/components/ui/display';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatINR } from '@/lib/format';
import { CustomerPicker } from './customer-picker';
import { usePos } from './pos-store';

const METHODS: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: 'UPI', label: 'UPI', icon: Smartphone },
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'CARD', label: 'Card', icon: CreditCard },
];

/** Exact amount plus the next round sums a customer is likely to hand over. */
function cashSuggestions(total: number): number[] {
  const rupees = Math.ceil(total / 100);
  const options = new Set<number>([rupees]);
  for (const step of [10, 50, 100, 500, 2000]) options.add(Math.ceil(rupees / step) * step);
  return [...options].sort((a, b) => a - b).slice(0, 4);
}

export function useBillTotals() {
  const { lines, customer, redeemPoints } = usePos();
  return useMemo(() => {
    const priced = lines.map((l) => ({
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      taxRate: l.taxRate,
    }));
    const gross = priced.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const maxRedeem = customer
      ? Math.min(
          customer.loyaltyPoints,
          Math.floor((gross * LOYALTY.maxRedeemShare) / LOYALTY.pointValuePaise),
        )
      : 0;
    const redeem = Math.min(redeemPoints, maxRedeem);
    const totals = computeBillTotals(priced, redeem * LOYALTY.pointValuePaise);
    const items = lines.reduce((s, l) => s + l.quantity, 0);
    return { ...totals, maxRedeem, redeem, items };
  }, [lines, customer, redeemPoints]);
}

export function BillPanel({
  phoneRef,
  onComplete,
}: {
  phoneRef: RefObject<HTMLInputElement | null>;
  onComplete: (sale: SaleDTO) => void;
}) {
  const queryClient = useQueryClient();
  const pos = usePos();
  const totals = useBillTotals();
  const change =
    pos.paymentMethod === 'CASH' && pos.tendered !== null ? pos.tendered - totals.total : null;
  const cashShort =
    pos.paymentMethod === 'CASH' && (pos.tendered === null || pos.tendered < totals.total);
  const canCharge = pos.lines.length > 0 && !cashShort;

  const charge = useMutation({
    mutationFn: () => {
      const body: CheckoutInput = {
        items: pos.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        customerId: pos.customer?.id,
        paymentMethod: pos.paymentMethod,
        amountTendered: pos.paymentMethod === 'CASH' ? (pos.tendered ?? undefined) : undefined,
        redeemPoints: totals.redeem,
        idempotencyKey: pos.idempotencyKey,
      };
      return api.post<SaleDTO>('/sales', body);
    },
    onSuccess: (sale) => {
      pos.reset();
      onComplete(sale);
      void queryClient.invalidateQueries({ queryKey: ['pos', 'products'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : 'The sale did not go through. Try again.',
      );
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: ['pos', 'products'] });
      }
    },
  });

  const chargeHotkey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== 'F9') return;
    e.preventDefault();
    if (canCharge && !charge.isPending) charge.mutate();
  });
  useEffect(() => {
    window.addEventListener('keydown', chargeHotkey);
    return () => window.removeEventListener('keydown', chargeHotkey);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <CustomerPicker phoneRef={phoneRef} />

      {/* The bill itself, printed on till-roll paper. */}
      <div className="receipt flex min-h-0 flex-1 flex-col px-4 shadow-lift">
        <div className="flex items-baseline justify-between font-mono text-xs text-ink-faint">
          <span>QUICKBILL MART</span>
          <span>{totals.items} items</span>
        </div>
        <div className="receipt-rule my-2" />

        <ul className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1" aria-label="Items on the bill">
          {pos.lines.length === 0 && (
            <li className="flex h-full min-h-32 flex-col items-center justify-center text-center text-sm text-ink-faint">
              Scan or tap a product to start a bill.
            </li>
          )}
          {pos.lines.map((line) => {
            const over = line.quantity > line.available;
            return (
              <li
                key={line.productId}
                className="group border-b border-dashed border-line py-2 last:border-0"
              >
                <div className="flex items-start gap-2">
                  <Packshot
                    size="xs"
                    className="mt-0.5 size-7 shrink-0 rounded-md"
                    product={{ ...line, imageUrl: null }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug font-medium">{line.name}</p>
                    <p className="font-mono text-xs text-ink-faint">
                      {formatINR(line.unitPrice)} / {line.unit}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {formatINR(line.unitPrice * line.quantity)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between pl-9">
                  <div className="flex items-center rounded-lg border border-line">
                    <button
                      className="grid size-7 place-items-center text-ink-soft hover:text-ink"
                      onClick={() => pos.setQuantity(line.productId, line.quantity - 1)}
                      aria-label={`One less ${line.name}`}
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-8 text-center font-mono text-sm tabular-nums">
                      {line.quantity}
                    </span>
                    <button
                      className="grid size-7 place-items-center text-ink-soft hover:text-ink disabled:opacity-40"
                      onClick={() => pos.setQuantity(line.productId, line.quantity + 1)}
                      disabled={line.quantity >= line.available}
                      aria-label={`One more ${line.name}`}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  {over && (
                    <span className="text-xs text-chilli-600">Only {line.available} in stock</span>
                  )}
                  <button
                    className="grid size-7 place-items-center rounded-md text-ink-faint opacity-60 hover:bg-chilli-50 hover:text-chilli-600 group-hover:opacity-100"
                    onClick={() => pos.removeLine(line.productId)}
                    aria-label={`Remove ${line.name}`}
                  >
                    <Trash className="size-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="receipt-rule my-2" />
        <dl className="space-y-1 font-mono text-[13px]">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Subtotal</dt>
            <dd className="tabular-nums">{formatINR(totals.subtotal)}</dd>
          </div>
          {pos.customer && totals.maxRedeem > 0 && (
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-2 text-ink-soft">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-3.5 accent-peacock-600"
                    checked={totals.redeem > 0}
                    onChange={(e) => pos.setRedeemPoints(e.target.checked ? totals.maxRedeem : 0)}
                  />
                  Redeem {totals.maxRedeem} points
                </label>
              </dt>
              <dd className="text-leaf-700 tabular-nums">
                {totals.discount > 0 ? `− ${formatINR(totals.discount)}` : ''}
              </dd>
            </div>
          )}
          <div className="flex justify-between text-ink-faint">
            <dt>GST included</dt>
            <dd className="tabular-nums">{formatINR(totals.taxTotal)}</dd>
          </div>
        </dl>
      </div>

      <div className="flex items-end justify-between rounded-xl bg-turmeric-500 px-4 py-3 text-ink">
        <span className="pb-1 text-sm font-medium">To pay</span>
        <span className="type-display text-[44px] tabular-nums">{formatINR(totals.total)}</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Payment method">
        {METHODS.map((m) => (
          <button
            key={m.value}
            role="radio"
            aria-checked={pos.paymentMethod === m.value}
            onClick={() => pos.setPaymentMethod(m.value)}
            className={cn(
              'flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors',
              pos.paymentMethod === m.value
                ? 'border-ink bg-ink text-white'
                : 'border-line-strong bg-surface text-ink-soft hover:text-ink',
            )}
          >
            <m.icon className="size-4" /> {m.label}
          </button>
        ))}
      </div>

      {pos.paymentMethod === 'CASH' && pos.lines.length > 0 && (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            {cashSuggestions(totals.total).map((r) => (
              <button
                key={r}
                onClick={() => pos.setTendered(r * 100)}
                className={cn(
                  'h-9 flex-1 rounded-lg border text-sm tabular-nums',
                  pos.tendered === r * 100
                    ? 'border-peacock-600 bg-peacock-50 font-semibold text-peacock-700'
                    : 'border-line bg-surface hover:border-line-strong',
                )}
              >
                ₹{r.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex flex-1 items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 focus-within:border-peacock-500">
              <span className="text-sm text-ink-soft">Received ₹</span>
              <input
                inputMode="decimal"
                className="h-10 min-w-0 flex-1 bg-transparent text-right text-base tabular-nums outline-none"
                value={pos.tendered === null ? '' : String(pos.tendered / 100)}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d.]/g, '');
                  pos.setTendered(v ? Math.round(Number(v) * 100) : null);
                }}
                aria-label="Cash received in rupees"
              />
            </label>
            <div className="w-32 text-right">
              <p className="text-xs text-ink-faint">Change</p>
              <p
                className={cn(
                  'text-lg font-semibold tabular-nums',
                  change !== null && change < 0 ? 'text-chilli-600' : 'text-ink',
                )}
              >
                {change === null
                  ? '—'
                  : change < 0
                    ? `${formatINR(-change)} short`
                    : formatINR(change)}
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => charge.mutate()}
        disabled={!canCharge || charge.isPending}
        className="flex h-14 items-center justify-center gap-3 rounded-xl bg-peacock-600 text-lg font-semibold text-white transition-colors hover:bg-peacock-700 disabled:bg-ink/15 disabled:text-ink-faint"
      >
        {charge.isPending
          ? 'Charging…'
          : pos.lines.length === 0
            ? 'Add items to charge'
            : `Charge ${formatINR(totals.total)}`}
        {pos.lines.length > 0 && <Kbd className="border-white/30 bg-white/15 text-white">F9</Kbd>}
      </button>
    </div>
  );
}
