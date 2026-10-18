import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, MapPin, Phone, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { Dialog as D } from 'radix-ui';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  ORDER_TRANSITIONS,
  type OrderDTO,
  type OrderStatus,
  type Paginated,
  type PaymentStatus,
} from '@quickbill/shared';
import { Button } from '@/components/ui/button';
import {
  Badge,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  Panel,
  Skeleton,
  Table,
  Td,
  Th,
  type Tone,
} from '@/components/ui/display';
import { Segmented } from '@/components/ui/form';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  SheetContent,
} from '@/components/ui/overlay';
import { api } from '@/lib/api';
import { formatDateTime, formatINR, formatRelative, label } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { rowLinkClass, SearchField, SkeletonRows, useListParams } from '../sales/list-params';

export const ORDER_TONES: Record<OrderStatus, Tone> = {
  PENDING: 'turmeric',
  CONFIRMED: 'peacock',
  PACKED: 'aubergine',
  SHIPPED: 'peacock',
  DELIVERED: 'leaf',
  CANCELLED: 'chilli',
};

const PAYMENT_TONES: Record<PaymentStatus, Tone> = {
  PENDING: 'neutral',
  PAID: 'leaf',
  REFUNDED: 'aubergine',
  FAILED: 'chilli',
};

/** Button text for moving an order to the next status, and the toast once it has moved. */
const ACTIONS: Record<OrderStatus, { cta: string; done: string }> = {
  PENDING: { cta: 'Mark as pending', done: 'Order marked as pending' },
  CONFIRMED: { cta: 'Confirm order', done: 'Order confirmed' },
  PACKED: { cta: 'Mark as packed', done: 'Order marked as packed' },
  SHIPPED: { cta: 'Mark as shipped', done: 'Order marked as shipped' },
  DELIVERED: { cta: 'Mark as delivered', done: 'Order marked as delivered' },
  CANCELLED: { cta: 'Cancel order', done: 'Order cancelled' },
};

const STATUS_FILTERS: { value: '' | OrderStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function OrderDetail({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const order = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.get<OrderDTO>(`/orders/${orderId}`),
  });

  const update = useMutation({
    mutationFn: (status: OrderStatus) =>
      api.patch<OrderDTO>(`/orders/${orderId}/status`, { status }),
    onSuccess: (updated) => {
      toast.success(ACTIONS[updated.status].done, { description: `Order ${updated.number}` });
      queryClient.setQueryData(['order', orderId], updated);
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (updated.status === 'CANCELLED') {
        for (const key of ['products', 'product', 'movements', 'inventory-alerts']) {
          void queryClient.invalidateQueries({ queryKey: [key] });
        }
      }
      setConfirmCancel(false);
    },
  });

  if (order.isError)
    return (
      <div className="p-5">
        <ErrorState error={order.error} onRetry={() => order.refetch()} />
      </div>
    );
  const o = order.data;
  if (!o) {
    return (
      <div className="space-y-3 p-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const next = ORDER_TRANSITIONS[o.status];
  const forward = next.filter((s) => s !== 'CANCELLED');
  const address = o.shippingAddress;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-6 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={ORDER_TONES[o.status]}>{label(o.status)}</Badge>
          <Badge tone={PAYMENT_TONES[o.paymentStatus]}>
            {label(o.paymentMethod)}, {label(o.paymentStatus).toLowerCase()}
          </Badge>
          <span className="text-sm text-ink-faint">Placed {formatRelative(o.createdAt)}</span>
        </div>

        <section>
          <h3 className="mb-2 font-semibold">{o.contact.name}</h3>
          <ul className="space-y-1.5 text-sm text-ink-soft">
            <li className="flex items-center gap-2">
              <Phone className="size-4 text-ink-faint" />
              <a href={`tel:${o.contact.phone}`} className="hover:text-ink">
                {o.contact.phone}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 text-ink-faint" />
              <a href={`mailto:${o.contact.email}`} className="truncate hover:text-ink">
                {o.contact.email}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-ink-faint" />
              <span>
                {address.line1}
                {address.line2 && <>, {address.line2}</>}
                <br />
                {address.city}, {address.state} {address.pincode}
              </span>
            </li>
          </ul>
        </section>

        <section>
          <h3 className="mb-2 font-semibold">
            {o.items.reduce((s, i) => s + i.quantity, 0)} items
          </h3>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {o.items.map((item) => (
              <li
                key={item.productId}
                className="flex items-baseline justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate">{item.name}</span>
                  <span className="text-ink-faint tabular-nums">
                    {item.quantity} × {formatINR(item.unitPrice)}
                  </span>
                </span>
                <span className="font-medium tabular-nums">{formatINR(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Subtotal</dt>
              <dd className="tabular-nums">{formatINR(o.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Delivery</dt>
              <dd className="tabular-nums">{o.shippingFee ? formatINR(o.shippingFee) : 'Free'}</dd>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatINR(o.total)}</dd>
            </div>
            <div className="flex justify-between text-ink-faint">
              <dt>GST included</dt>
              <dd className="tabular-nums">{formatINR(o.taxTotal)}</dd>
            </div>
          </dl>
        </section>
      </div>

      {next.length > 0 && (
        <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-line bg-surface p-4">
          {forward.map((status) => (
            <Button
              key={status}
              onClick={() => update.mutate(status)}
              loading={update.isPending && update.variables === status}
              disabled={update.isPending}
            >
              {ACTIONS[status].cta}
            </Button>
          ))}
          {next.includes('CANCELLED') && (
            <Button
              variant="secondary"
              className="ml-auto text-chilli-600"
              onClick={() => setConfirmCancel(true)}
            >
              Cancel order
            </Button>
          )}
        </div>
      )}

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent
          title={`Cancel order ${o.number}?`}
          description={
            o.paymentStatus === 'PAID'
              ? 'The items go back into stock and the online payment is marked as refunded.'
              : 'The items go back into stock. The customer has not paid yet.'
          }
        >
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Keep order</Button>
            </DialogClose>
            <Button
              variant="danger"
              loading={update.isPending}
              onClick={() => update.mutate('CANCELLED')}
            >
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OrdersPage() {
  useDocumentTitle('Online orders');
  const navigate = useNavigate();
  const { values, page, set } = useListParams({ status: '', q: '', order: '' });

  const orders = useQuery({
    queryKey: ['orders', values.status, values.q, page],
    queryFn: () =>
      api.get<Paginated<OrderDTO>>('/orders', {
        status: values.status,
        q: values.q,
        page,
        pageSize: 25,
      }),
    placeholderData: keepPreviousData,
  });

  // Opening an order keeps the list's page and filters in the URL.
  const openOrder = (id: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('order', id);
    navigate({ search: params.toString() }, { replace: true });
  };
  const closeOrder = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete('order');
    navigate({ search: params.toString() }, { replace: true });
  };

  return (
    <>
      <PageHeader
        title="Online orders"
        description="Orders placed on the shop. Stock is reserved when an order comes in and released if it is cancelled."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchField
          value={values.q}
          onChange={(q) => set({ q })}
          placeholder="Order number, name or email"
        />
        <div className="max-w-full relative overflow-x-auto">
          <Segmented
            value={values.status as '' | OrderStatus}
            options={STATUS_FILTERS}
            onChange={(status) => set({ status })}
          />
        </div>
      </div>

      {orders.isError && <ErrorState error={orders.error} onRetry={() => orders.refetch()} />}

      <Panel className="overflow-hidden">
        <Table>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Placed</Th>
              <Th>Customer</Th>
              <Th className="text-right">Items</Th>
              <Th>Payment</Th>
              <Th>Status</Th>
              <Th className="text-right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {orders.isPending ? (
              <SkeletonRows cols={7} />
            ) : (
              orders.data?.items.map((o) => (
                <tr key={o.id} className={rowLinkClass} onClick={() => openOrder(o.id)}>
                  <Td>
                    <button
                      className="font-medium tabular-nums hover:text-peacock-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        openOrder(o.id);
                      }}
                    >
                      {o.number}
                    </button>
                  </Td>
                  <Td className="whitespace-nowrap text-ink-soft">{formatDateTime(o.createdAt)}</Td>
                  <Td>
                    <span className="block">{o.contact.name}</span>
                    <span className="block text-xs text-ink-faint">{o.contact.email}</span>
                  </Td>
                  <Td className="text-right tabular-nums">
                    {o.items.reduce((s, i) => s + i.quantity, 0)}
                  </Td>
                  <Td>
                    <Badge tone={PAYMENT_TONES[o.paymentStatus]}>
                      {o.paymentMethod === 'COD' ? 'COD' : 'Online'},{' '}
                      {label(o.paymentStatus).toLowerCase()}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge tone={ORDER_TONES[o.status]}>{label(o.status)}</Badge>
                  </Td>
                  <Td className="text-right font-medium tabular-nums">{formatINR(o.total)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
        {orders.data && orders.data.items.length === 0 && (
          <EmptyState icon={<ShoppingBag />} title="No orders here">
            {values.status || values.q
              ? 'Nothing matches this filter. Try another status or search.'
              : 'Orders from the online shop will show up here.'}
          </EmptyState>
        )}
        {orders.data && (
          <Pagination
            page={orders.data.page}
            totalPages={orders.data.totalPages}
            total={orders.data.total}
            onPage={(p) => set({ page: p })}
          />
        )}
      </Panel>

      <D.Root open={!!values.order} onOpenChange={(open) => !open && closeOrder()}>
        {values.order && (
          <SheetContent
            title={orders.data?.items.find((o) => o.id === values.order)?.number ?? 'Order'}
            description="Customer, delivery address and items"
          >
            <OrderDetail orderId={values.order} />
          </SheetContent>
        )}
      </D.Root>
    </>
  );
}
