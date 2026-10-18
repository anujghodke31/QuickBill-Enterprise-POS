import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronRight, Package } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import type { OrderDTO } from '@quickbill/shared';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/display';
import { api } from '@/lib/api';
import { formatDate, formatINR, label } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { isStaff, useAuth } from '@/stores/auth';
import { OrderStatusBadge, orderItemCount } from './components/order-status';

export default function AccountPage() {
  useDocumentTitle('Your account');
  const user = useAuth((s) => s.user)!;
  const clear = useAuth((s) => s.clear);
  const navigate = useNavigate();
  const orders = useQuery({
    queryKey: ['shop', 'orders', 'mine'],
    queryFn: () => api.get<OrderDTO[]>('/shop/orders/mine'),
  });
  const logout = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      clear();
      navigate('/');
    },
  });

  const totalSpent = (orders.data ?? [])
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((s, o) => s + o.total, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-heading text-3xl">Hello, {user.name.split(' ')[0]}</h1>
          <p className="mt-1 text-ink-soft">{user.email}</p>
        </div>
        <div className="flex gap-2">
          {isStaff(user) && (
            <Button asChild variant="secondary">
              <Link to={user.role === 'CASHIER' ? '/admin/pos' : '/admin'}>Back office</Link>
            </Button>
          )}
          <Button variant="ghost" onClick={() => logout.mutate()} loading={logout.isPending}>
            Sign out
          </Button>
        </div>
      </div>

      {orders.data && orders.data.length > 0 && (
        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
          <div className="bg-surface p-4">
            <dt className="text-sm text-ink-soft">Orders</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{orders.data.length}</dd>
          </div>
          <div className="bg-surface p-4">
            <dt className="text-sm text-ink-soft">Spent online</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{formatINR(totalSpent)}</dd>
          </div>
          <div className="col-span-2 bg-surface p-4 sm:col-span-1">
            <dt className="text-sm text-ink-soft">Last order</dt>
            <dd className="mt-1 text-2xl font-semibold">{formatDate(orders.data[0]!.createdAt)}</dd>
          </div>
        </dl>
      )}

      <section className="mt-10" aria-labelledby="orders-heading">
        <h2 id="orders-heading" className="type-heading text-xl">
          Your orders
        </h2>
        <div className="mt-4">
          {orders.error ? (
            <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
          ) : orders.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          ) : orders.data!.length === 0 ? (
            <EmptyState
              icon={<Package />}
              title="No orders yet"
              action={
                <Button asChild>
                  <Link to="/">Start shopping</Link>
                </Button>
              }
              className="rounded-2xl border border-line bg-surface"
            >
              Orders you place online show up here, with live status.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {orders.data!.map((o) => (
                <li key={o.id}>
                  <Link
                    to={`/orders/${o.number}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-paper"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{o.number}</p>
                      <p className="mt-0.5 truncate text-sm text-ink-faint">
                        {formatDate(o.createdAt)}, {orderItemCount(o)}{' '}
                        {orderItemCount(o) === 1 ? 'item' : 'items'},{' '}
                        {label(o.paymentMethod).toLowerCase()}
                      </p>
                    </div>
                    <OrderStatusBadge status={o.status} />
                    <p className="w-24 text-right font-semibold tabular-nums">
                      {formatINR(o.total)}
                    </p>
                    <ChevronRight className="size-4 text-ink-faint" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
