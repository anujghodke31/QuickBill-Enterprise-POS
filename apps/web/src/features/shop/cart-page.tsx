import { ShoppingBasket, Trash } from 'lucide-react';
import { Link } from 'react-router';
import { Packshot } from '@/components/packshot';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/display';
import { cn } from '@/lib/cn';
import { formatINR } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { cartSubtotal, useCart } from '@/stores/cart';
import { deliveryFee, FreeDeliveryMeter, useCartCheck } from './components/cart-helpers';
import { QuantityStepper } from './components/product-card';

export default function CartPage() {
  useDocumentTitle('Your cart');
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const { stock, isFetching } = useCartCheck(lines);

  const subtotal = cartSubtotal(lines);
  const fee = deliveryFee(subtotal);
  const unavailable = lines.filter((l) => stock.get(l.productId) === 'out');

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={<ShoppingBasket />}
          title="Your cart is empty"
          action={
            <Button asChild>
              <Link to="/">Start shopping</Link>
            </Button>
          }
        >
          Search for what you need, or browse the aisles to fill your basket.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="type-heading text-3xl">Your cart</h1>
      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {lines.map((line) => {
            const out = stock.get(line.productId) === 'out';
            return (
              <li key={line.productId} className="flex gap-4 p-4">
                <Link to={`/p/${line.slug}`} className="shrink-0" aria-label={line.name}>
                  <Packshot
                    product={line}
                    size="sm"
                    className={cn('size-20 rounded-xl', out && 'opacity-50')}
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/p/${line.slug}`}
                      className="line-clamp-2 font-medium hover:text-peacock-700"
                    >
                      {line.name}
                    </Link>
                    <p className="text-sm text-ink-faint">
                      {line.unit}, {formatINR(line.price)} each
                    </p>
                    {out && (
                      <p className="mt-1 text-sm font-medium text-chilli-600">
                        Out of stock, remove to continue
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <QuantityStepper
                      value={line.quantity}
                      onChange={(q) => setQuantity(line.productId, q)}
                      size="sm"
                      label={line.name}
                    />
                    <p className="w-20 text-right font-semibold tabular-nums">
                      {formatINR(line.price * line.quantity)}
                    </p>
                    <button
                      onClick={() => remove(line.productId)}
                      className="grid size-8 place-items-center rounded-lg text-ink-faint hover:bg-chilli-50 hover:text-chilli-600"
                      aria-label={`Remove ${line.name}`}
                    >
                      <Trash className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside
          className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-40"
          aria-label="Order summary"
        >
          <h2 className="type-heading text-lg">Summary</h2>
          <dl className="mt-4 space-y-2 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Items ({lines.reduce((s, l) => s + l.quantity, 0)})</dt>
              <dd className="tabular-nums">{formatINR(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Delivery</dt>
              <dd className="tabular-nums">{fee === 0 ? 'Free' : formatINR(fee)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatINR(subtotal + fee)}</dd>
            </div>
          </dl>
          <p className="mt-1 text-xs text-ink-faint">Prices include GST.</p>
          <div className="mt-5">
            <FreeDeliveryMeter subtotal={subtotal} />
          </div>
          {unavailable.length > 0 ? (
            <Button size="lg" className="mt-5 w-full" disabled>
              Remove unavailable items to continue
            </Button>
          ) : (
            <Button asChild size="lg" className="mt-5 w-full" aria-disabled={isFetching}>
              <Link to="/checkout">Go to checkout</Link>
            </Button>
          )}
          <Link to="/" className="mt-3 block text-center text-sm text-peacock-600 hover:underline">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
