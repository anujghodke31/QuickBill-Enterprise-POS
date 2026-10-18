import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  PAYMENT_METHODS,
  type PaymentMethod,
  type ReturnDTO,
  type ReturnInput,
  type SaleDTO,
} from '@quickbill/shared';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Select, Textarea } from '@/components/ui/form';
import { Dialog, DialogClose, DialogContent, DialogFooter } from '@/components/ui/overlay';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatINR, label } from '@/lib/format';

interface LineState {
  quantity: number;
  restock: boolean;
}

/** Choose items and quantities from a bill to return, then record the refund. */
export function ReturnDialog({
  sale,
  open,
  onOpenChange,
  onReturned,
}: {
  sale: SaleDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReturned?: (ret: ReturnDTO) => void;
}) {
  const queryClient = useQueryClient();
  const returnable = sale.items.filter((i) => i.quantity - i.returnedQty > 0);
  const [lines, setLines] = useState<Record<string, LineState>>({});
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>(sale.paymentMethod);
  const [error, setError] = useState<string | null>(null);

  // Refunds are pro-rated by any bill-level discount (loyalty points) the customer received.
  const paidRatio = sale.subtotal === 0 ? 0 : sale.total / sale.subtotal;
  const selected = Object.entries(lines).filter(([, l]) => l.quantity > 0);
  const refund = selected.reduce((sum, [id, l]) => {
    const item = sale.items.find((i) => i.id === id);
    return sum + (item ? Math.round(item.unitPrice * l.quantity * paidRatio) : 0);
  }, 0);

  const reset = () => {
    setLines({});
    setReason('');
    setRefundMethod(sale.paymentMethod);
    setError(null);
  };

  const create = useMutation({
    mutationFn: (input: ReturnInput) => api.post<ReturnDTO>('/returns', input),
    onSuccess: (ret) => {
      toast.success(`Return ${ret.number} recorded`, {
        description: `Refund ${formatINR(ret.refundAmount)} by ${label(ret.refundMethod)}.`,
      });
      for (const key of [
        'sale',
        'sales',
        'returns',
        'products',
        'product',
        'movements',
        'inventory-alerts',
        'customer',
        'customers',
      ]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
      reset();
      onOpenChange(false);
      onReturned?.(ret);
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Could not record the return.'),
  });

  const setLine = (id: string, patch: Partial<LineState>) =>
    setLines((prev) => ({
      ...prev,
      [id]: { quantity: 0, restock: true, ...prev[id], ...patch },
    }));

  const submit = () => {
    setError(null);
    if (selected.length === 0) return setError('Choose at least one item to return.');
    if (reason.trim().length < 3) return setError('Add a short reason for the return.');
    create.mutate({
      saleId: sale.id,
      items: selected.map(([saleItemId, l]) => ({
        saleItemId,
        quantity: l.quantity,
        restock: l.restock,
      })),
      reason: reason.trim(),
      refundMethod,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent
        wide
        title={`Return items from bill ${sale.number}`}
        description="Pick what is coming back. Items marked for restock go back on the shelf."
      >
        {returnable.length === 0 ? (
          <p className="text-ink-soft">Everything on this bill has already been returned.</p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {returnable.map((item) => {
              const max = item.quantity - item.returnedQty;
              const line = lines[item.id] ?? { quantity: 0, restock: true };
              return (
                <li
                  key={item.id}
                  className={cn(
                    'flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3',
                    line.quantity > 0 && 'bg-turmeric-50',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="text-sm text-ink-faint tabular-nums">
                      {formatINR(item.unitPrice)} each, {max} of {item.quantity} returnable
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1"
                    role="group"
                    aria-label={`Quantity of ${item.name} to return`}
                  >
                    <Button
                      variant="secondary"
                      size="icon"
                      className="size-8"
                      onClick={() => setLine(item.id, { quantity: Math.max(0, line.quantity - 1) })}
                      disabled={line.quantity === 0}
                      aria-label="Return one fewer"
                    >
                      <Minus />
                    </Button>
                    <span className="w-8 text-center font-medium tabular-nums">
                      {line.quantity}
                    </span>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="size-8"
                      onClick={() =>
                        setLine(item.id, { quantity: Math.min(max, line.quantity + 1) })
                      }
                      disabled={line.quantity >= max}
                      aria-label="Return one more"
                    >
                      <Plus />
                    </Button>
                  </div>
                  <Checkbox
                    label="Restock"
                    checked={line.restock}
                    disabled={line.quantity === 0}
                    onChange={(e) => setLine(item.id, { restock: e.target.checked })}
                  />
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_200px]">
          <Field label="Reason">
            {(p) => (
              <Textarea
                {...p}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="For example: damaged packaging"
                className="min-h-20"
                maxLength={300}
              />
            )}
          </Field>
          <Field label="Refund by">
            {(p) => (
              <Select
                {...p}
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {label(m)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        {sale.discount > 0 && (
          <p className="mt-3 text-sm text-ink-faint">
            This bill used loyalty points, so the refund is reduced in proportion to the discount.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-chilli-50 px-3 py-2 text-sm text-chilli-700"
          >
            {error}
          </p>
        )}

        <DialogFooter className="items-center justify-between">
          <p className="mr-auto text-ink-soft">
            Refund <span className="font-semibold text-ink tabular-nums">{formatINR(refund)}</span>
          </p>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={submit} loading={create.isPending} disabled={returnable.length === 0}>
            Record return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
