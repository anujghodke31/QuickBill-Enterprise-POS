import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, CreditCard } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { useForm, type FieldPath } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router';
import type { z } from 'zod';
import { placeOrderSchema, type OrderDTO, type PlaceOrderInput } from '@quickbill/shared';
import { Packshot } from '@/components/packshot';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatINR } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { useAuth } from '@/stores/auth';
import { cartSubtotal, useCart } from '@/stores/cart';
import { deliveryFee, useCartCheck } from './components/cart-helpers';

const checkoutSchema = placeOrderSchema.omit({ items: true });
type CheckoutForm = z.input<typeof checkoutSchema>;

const PAYMENT_OPTIONS = [
  {
    value: 'COD' as const,
    title: 'Cash on delivery',
    detail: 'Pay the rider in cash or by UPI when your order arrives.',
    icon: Banknote,
  },
  {
    value: 'ONLINE' as const,
    title: 'Pay online now',
    detail: 'Simulated in this demo: the order is marked as paid and no money is taken.',
    icon: CreditCard,
  },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <legend className="sr-only">{title}</legend>
      <h2 className="type-heading mb-4 text-lg" aria-hidden>
        {title}
      </h2>
      {children}
    </fieldset>
  );
}

export default function CheckoutPage() {
  useDocumentTitle('Checkout');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuth((s) => s.user);
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const placed = useRef(false);
  const { stock } = useCartCheck(lines);

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      contact: { name: user?.name ?? '', email: user?.email ?? '', phone: '' },
      shippingAddress: { line1: '', line2: '', city: 'Pune', state: 'Maharashtra', pincode: '' },
      paymentMethod: 'COD',
    },
  });

  const placeOrder = useMutation({
    mutationFn: (body: PlaceOrderInput) => api.post<OrderDTO>('/shop/orders', body),
    onSuccess: (order) => {
      placed.current = true;
      clear();
      queryClient.invalidateQueries({ queryKey: ['shop', 'orders'] });
      navigate(`/orders/${order.number}`, {
        replace: true,
        state: { order, email: order.contact.email },
      });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        for (const [path, message] of Object.entries(error.fieldErrors)) {
          if (path.startsWith('contact') || path.startsWith('shippingAddress')) {
            form.setError(path as FieldPath<CheckoutForm>, { message });
          }
        }
        // Stock changed since the cart was loaded: refresh availability.
        if (error.status === 409 || error.status === 422) {
          queryClient.invalidateQueries({ queryKey: ['shop', 'cart-check'] });
        }
      }
      form.setError('root', { message: error.message });
    },
  });

  if (lines.length === 0 && !placed.current) return <Navigate to="/cart" replace />;

  const subtotal = cartSubtotal(lines);
  const fee = deliveryFee(subtotal);
  const unavailable = lines.some((l) => stock.get(l.productId) === 'out');
  const { errors } = form.formState;
  const payment = form.watch('paymentMethod');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="type-heading text-3xl">Checkout</h1>
      {!user && (
        <p className="mt-1 text-ink-soft">
          Checking out as a guest.{' '}
          <Link
            to="/login"
            state={{ from: '/checkout' }}
            className="font-medium text-peacock-600 hover:underline"
          >
            Sign in
          </Link>{' '}
          to save this order to your account.
        </p>
      )}

      <form
        noValidate
        onSubmit={form.handleSubmit((values) =>
          placeOrder.mutate({
            ...values,
            items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          }),
        )}
        className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_380px]"
      >
        <div className="space-y-6">
          <Section title="Contact details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Full name"
                error={errors.contact?.name?.message}
                className="sm:col-span-2"
              >
                {(p) => <Input {...p} autoComplete="name" {...form.register('contact.name')} />}
              </Field>
              <Field
                label="Email"
                hint="We send order updates here."
                error={errors.contact?.email?.message}
              >
                {(p) => (
                  <Input
                    {...p}
                    type="email"
                    autoComplete="email"
                    {...form.register('contact.email')}
                  />
                )}
              </Field>
              <Field
                label="Mobile number"
                hint="For the delivery rider."
                error={errors.contact?.phone?.message}
              >
                {(p) => (
                  <Input
                    {...p}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    {...form.register('contact.phone')}
                  />
                )}
              </Field>
            </div>
          </Section>

          <Section title="Delivery address">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Flat, house or building"
                error={errors.shippingAddress?.line1?.message}
                className="sm:col-span-2"
              >
                {(p) => (
                  <Input
                    {...p}
                    autoComplete="address-line1"
                    {...form.register('shippingAddress.line1')}
                  />
                )}
              </Field>
              <Field
                label="Street and area"
                hint="Optional"
                error={errors.shippingAddress?.line2?.message}
                className="sm:col-span-2"
              >
                {(p) => (
                  <Input
                    {...p}
                    autoComplete="address-line2"
                    {...form.register('shippingAddress.line2')}
                  />
                )}
              </Field>
              <Field label="City" error={errors.shippingAddress?.city?.message}>
                {(p) => (
                  <Input
                    {...p}
                    autoComplete="address-level2"
                    {...form.register('shippingAddress.city')}
                  />
                )}
              </Field>
              <Field label="State" error={errors.shippingAddress?.state?.message}>
                {(p) => (
                  <Input
                    {...p}
                    autoComplete="address-level1"
                    {...form.register('shippingAddress.state')}
                  />
                )}
              </Field>
              <Field label="PIN code" error={errors.shippingAddress?.pincode?.message}>
                {(p) => (
                  <Input
                    {...p}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={6}
                    {...form.register('shippingAddress.pincode')}
                  />
                )}
              </Field>
            </div>
          </Section>

          <Section title="Payment">
            <div
              className="grid gap-3 sm:grid-cols-2"
              role="radiogroup"
              aria-label="Payment method"
            >
              {PAYMENT_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-peacock-500',
                    payment === o.value
                      ? 'border-peacock-600 bg-peacock-50'
                      : 'border-line hover:border-line-strong',
                  )}
                >
                  <input
                    type="radio"
                    value={o.value}
                    className="sr-only"
                    {...form.register('paymentMethod')}
                  />
                  <o.icon
                    className={cn(
                      'mt-0.5 size-5 shrink-0',
                      payment === o.value ? 'text-peacock-700' : 'text-ink-faint',
                    )}
                  />
                  <span>
                    <span className="block font-medium">{o.title}</span>
                    <span className="mt-0.5 block text-sm text-ink-soft">{o.detail}</span>
                  </span>
                </label>
              ))}
            </div>
          </Section>
        </div>

        <aside
          className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-40"
          aria-label="Order summary"
        >
          <h2 className="type-heading text-lg">Your order</h2>
          <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
            {lines.map((l) => (
              <li key={l.productId} className="flex items-center gap-3">
                <Packshot product={l} size="xs" className="size-10 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{l.name}</p>
                  <p className="text-xs text-ink-faint">
                    {l.quantity} × {formatINR(l.price)}
                    {stock.get(l.productId) === 'out' && (
                      <span className="ml-2 text-chilli-600">Out of stock</span>
                    )}
                  </p>
                </div>
                <p className="text-sm font-medium tabular-nums">
                  {formatINR(l.price * l.quantity)}
                </p>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Items</dt>
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

          {errors.root && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-chilli-50 px-3 py-2 text-sm text-chilli-700"
            >
              {errors.root.message}
            </p>
          )}
          {unavailable && (
            <p className="mt-4 text-sm text-chilli-600">
              Some items are out of stock.{' '}
              <Link to="/cart" className="font-medium underline">
                Update your cart
              </Link>{' '}
              to continue.
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            className="mt-5 w-full"
            loading={placeOrder.isPending}
            disabled={unavailable}
          >
            {payment === 'ONLINE' ? 'Pay' : 'Place order'} {formatINR(subtotal + fee)}
          </Button>
        </aside>
      </form>
    </div>
  );
}
