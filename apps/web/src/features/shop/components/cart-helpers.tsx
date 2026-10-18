import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { SHIPPING, type StoreProductDTO } from '@quickbill/shared';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatINR } from '@/lib/format';
import { useCart, type CartLine } from '@/stores/cart';

/** Re-reads current price and availability for everything in the cart. */
export function useCartCheck(lines: CartLine[]) {
  const sync = useCart((s) => s.sync);
  const key = useMemo(
    () =>
      lines
        .map((l) => l.productId)
        .sort()
        .join(','),
    [lines],
  );
  const query = useQuery({
    queryKey: ['shop', 'cart-check', key],
    queryFn: () => api.post<StoreProductDTO[]>('/shop/products/batch', { ids: key.split(',') }),
    enabled: key.length > 0,
    staleTime: 15_000,
  });
  useEffect(() => {
    if (query.data) sync(query.data);
  }, [query.data, sync]);
  const stock = useMemo(
    () => new Map((query.data ?? []).map((p) => [p.id, p.stockLevel])),
    [query.data],
  );
  return { ...query, stock };
}

export function deliveryFee(subtotal: number) {
  return subtotal >= SHIPPING.freeAbovePaise ? 0 : SHIPPING.flatFeePaise;
}

export function FreeDeliveryMeter({ subtotal }: { subtotal: number }) {
  const remaining = SHIPPING.freeAbovePaise - subtotal;
  const progress = Math.min(1, subtotal / SHIPPING.freeAbovePaise);
  return (
    <div>
      <p className="text-sm text-ink-soft">
        {remaining > 0 ? (
          <>
            Add <span className="font-semibold text-ink tabular-nums">{formatINR(remaining)}</span>{' '}
            more for free delivery
          </>
        ) : (
          <span className="font-medium text-leaf-700">Your order qualifies for free delivery</span>
        )}
      </p>
      <div
        className="mt-2 h-1.5 rounded-full bg-ink/[0.07]"
        role="progressbar"
        aria-label="Progress towards free delivery"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <div
          className={cn('h-full rounded-full', remaining > 0 ? 'bg-turmeric-500' : 'bg-leaf-600')}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
