import { useQuery } from '@tanstack/react-query';
import { CircleCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import type { OrderDTO } from '@quickbill/shared';
import { Packshot } from '@/components/packshot';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/display';
import { Field, Input } from '@/components/ui/form';
import { api, ApiError } from '@/lib/api';
import { formatDateTime, formatINR, label } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { useAuth } from '@/stores/auth';
import { OrderStatusBadge, OrderTimeline, orderItemCount } from './components/order-status';

interface OrderLocationState {
  order?: OrderDTO;
  email?: string;
}

function OrderView({ order, justPlaced }: { order: OrderDTO; justPlaced: boolean }) {
  const address = order.shippingAddress;
  return (
    <div>
      {justPlaced && (
        <div className="mb-8 flex gap-3 rounded-2xl border border-leaf-100 bg-leaf-50 p-5">
          <CircleCheck className="mt-0.5 size-6 shrink-0 text-leaf-600" />
          <div>
            <p className="type-heading text-xl text-leaf-700">
              Thank you, {order.contact.name.split(' ')[0]}. Your order is in.
            </p>
            <p className="mt-1 text-ink-soft">
              Keep your order number <span className="font-semibold text-ink">{order.number}</span>{' '}
              to track it later with your email address.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="type-heading text-3xl">Order {order.number}</h1>
          <p className="mt-1 text-ink-soft">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <OrderTimeline status={order.status} />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-line bg-surface" aria-label="Items">
          <h2 className="type-heading border-b border-line px-5 py-4 text-lg">
            {orderItemCount(order)} {orderItemCount(order) === 1 ? 'item' : 'items'}
          </h2>
          <ul className="divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.productId} className="flex items-center gap-4 px-5 py-3">
                <div className="relative shrink-0">
                  <Packshot product={item} size="sm" className="size-14 rounded-xl" />
                  <span
                    className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-xs font-semibold text-white tabular-nums"
                    aria-hidden
                  >
                    {item.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  {item.slug ? (
                    <Link to={`/p/${item.slug}`} className="line-clamp-2 hover:text-peacock-700">
                      {item.name}
                    </Link>
                  ) : (
                    <p className="line-clamp-2">{item.name}</p>
                  )}
                  <p className="text-sm text-ink-faint">
                    {item.unit}, {item.quantity} × {formatINR(item.unitPrice)}
                  </p>
                </div>
                <p className="font-medium tabular-nums">{formatINR(item.lineTotal)}</p>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-6 rounded-2xl border border-line bg-surface p-5">
          <dl className="space-y-2 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Items</dt>
              <dd className="tabular-nums">{formatINR(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Delivery</dt>
              <dd className="tabular-nums">
                {order.shippingFee === 0 ? 'Free' : formatINR(order.shippingFee)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatINR(order.total)}</dd>
            </div>
            <div className="flex justify-between text-sm text-ink-faint">
              <dt>Includes GST</dt>
              <dd className="tabular-nums">{formatINR(order.taxTotal)}</dd>
            </div>
          </dl>
          <div className="border-t border-line pt-5">
            <h2 className="font-semibold">Payment</h2>
            <p className="mt-1 text-ink-soft">
              {label(order.paymentMethod)}, {label(order.paymentStatus).toLowerCase()}
            </p>
          </div>
          <div className="border-t border-line pt-5">
            <h2 className="font-semibold">Delivering to</h2>
            <address className="mt-1 text-ink-soft not-italic">
              {order.contact.name}
              <br />
              {address.line1}
              {address.line2 && (
                <>
                  <br />
                  {address.line2}
                </>
              )}
              <br />
              {address.city}, {address.state} {address.pincode}
              <br />
              {order.contact.phone}
            </address>
          </div>
        </aside>
      </div>
    </div>
  );
}

function LookupForm({
  number,
  onSubmit,
  error,
  loading,
}: {
  number: string;
  onSubmit: (email: string) => void;
  error?: string;
  loading: boolean;
}) {
  const [email, setEmail] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim()) onSubmit(email.trim().toLowerCase());
  };
  return (
    <div className="mx-auto max-w-md">
      <h1 className="type-heading text-3xl">Order {number}</h1>
      <p className="mt-2 text-ink-soft">
        Enter the email address used for this order to see its details.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Field label="Email" error={error}>
          {(p) => (
            <Input
              {...p}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit" className="w-full" loading={loading}>
          Show my order
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        Have an account?{' '}
        <Link
          to="/login"
          state={{ from: `/orders/${number}` }}
          className="font-medium text-peacock-600 hover:underline"
        >
          Sign in
        </Link>{' '}
        to see all your orders.
      </p>
    </div>
  );
}

export default function OrderPage() {
  const { number = '' } = useParams();
  const orderNumber = number.toUpperCase();
  useDocumentTitle(`Order ${orderNumber}`);
  const location = useLocation();
  const state = (location.state ?? {}) as OrderLocationState;
  const stateOrder = state.order?.number === orderNumber ? state.order : undefined;
  const user = useAuth((s) => s.user);
  const authStatus = useAuth((s) => s.status);
  const [email, setEmail] = useState(state.email);

  const lookup = useQuery({
    queryKey: ['shop', 'orders', 'lookup', orderNumber, email],
    queryFn: () => api.post<OrderDTO>('/shop/orders/lookup', { number: orderNumber, email }),
    enabled: !!email,
    initialData: stateOrder,
    retry: false,
  });
  const mine = useQuery({
    queryKey: ['shop', 'orders', 'mine'],
    queryFn: () => api.get<OrderDTO[]>('/shop/orders/mine'),
    enabled: !!user && !email,
  });

  const order = lookup.data ?? mine.data?.find((o) => o.number === orderNumber);
  const waiting =
    authStatus === 'loading' || (mine.isLoading && !!user) || (lookup.isFetching && !lookup.data);
  const lookupError =
    lookup.error instanceof ApiError && lookup.error.status === 404
      ? 'No order matches that number and email.'
      : lookup.error?.message;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {order ? (
        <OrderView order={order} justPlaced={!!stateOrder} />
      ) : waiting && !lookup.error ? (
        <div className="space-y-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <LookupForm
          number={orderNumber}
          onSubmit={setEmail}
          error={lookupError}
          loading={lookup.isFetching}
        />
      )}
    </div>
  );
}
