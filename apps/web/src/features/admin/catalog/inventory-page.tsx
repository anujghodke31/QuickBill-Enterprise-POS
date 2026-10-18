import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Boxes, CalendarClock, PackageX, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { Paginated, StockMovementDTO, StockReason } from '@quickbill/shared';
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
} from '@/components/ui/display';
import { Segmented } from '@/components/ui/form';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime, label } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { SkeletonRows, useListParams } from '../sales/list-params';

interface Alerts {
  lowStockTotal: number;
  expiringTotal: number;
  lowStock: { id: string; name: string; sku: string; stock: number; reorderPoint: number }[];
  expiring: {
    id: string;
    name: string;
    sku: string;
    stock: number;
    expiryDate: string;
    expired: boolean;
  }[];
}

const REASONS: { value: '' | StockReason; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'SALE', label: 'Sales' },
  { value: 'ONLINE_ORDER', label: 'Online orders' },
  { value: 'PURCHASE', label: 'Received' },
  { value: 'RETURN', label: 'Returns' },
  { value: 'ADJUSTMENT', label: 'Adjustments' },
  { value: 'ORDER_CANCEL', label: 'Cancellations' },
];

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function AlertList({
  title,
  icon,
  empty,
  loading,
  total,
  children,
}: {
  title: string;
  total?: number;
  icon: ReactNode;
  empty: string;
  loading: boolean;
  children: ReactNode[] | undefined;
}) {
  return (
    <Panel className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
        <span className="text-ink-faint [&_svg]:size-[18px]">{icon}</span>
        <h2 className="type-heading text-lg">{title}</h2>
        {!!total && (
          <span className="ml-auto text-sm text-ink-faint tabular-nums">
            {children && children.length < total ? `${children.length} of ${total}` : total}
          </span>
        )}
      </div>
      {loading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : children && children.length > 0 ? (
        <ul className="max-h-80 divide-y divide-line overflow-y-auto">{children}</ul>
      ) : (
        <p className="px-5 py-8 text-center text-ink-soft">{empty}</p>
      )}
    </Panel>
  );
}

export default function InventoryPage() {
  useDocumentTitle('Inventory');
  const { values, page, set } = useListParams({ reason: '', productId: '' });

  const alerts = useQuery({
    queryKey: ['inventory-alerts'],
    queryFn: () => api.get<Alerts>('/inventory/alerts'),
  });

  const movements = useQuery({
    queryKey: ['movements', values, page],
    queryFn: () =>
      api.get<Paginated<StockMovementDTO>>('/inventory/movements', {
        reason: values.reason,
        productId: values.productId,
        page,
        pageSize: 30,
      }),
    placeholderData: keepPreviousData,
  });

  const filteredProduct = values.productId ? movements.data?.items[0]?.product : undefined;

  return (
    <>
      <PageHeader
        title="Inventory"
        description="What needs attention on the shelves, and every unit that moved in or out."
      />

      {alerts.isError && <ErrorState error={alerts.error} onRetry={() => alerts.refetch()} />}

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <AlertList
          title="Running low"
          icon={<PackageX />}
          empty="Nothing is at or below its reorder point."
          loading={alerts.isPending}
          total={alerts.data?.lowStockTotal}
        >
          {alerts.data?.lowStock.map((p) => (
            <li key={p.id}>
              <Link
                to={`/admin/products/${p.id}`}
                className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-paper/70"
              >
                <span className="min-w-0">
                  <span className="block truncate">{p.name}</span>
                  <span className="text-xs text-ink-faint tabular-nums">{p.sku}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-sm">
                  {p.stock <= 0 ? (
                    <Badge tone="chilli">Out</Badge>
                  ) : (
                    <Badge tone="turmeric">Low</Badge>
                  )}
                  <span className="w-16 text-right text-ink-soft tabular-nums">
                    <span className="font-medium text-ink">{p.stock}</span> / {p.reorderPoint}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </AlertList>

        <AlertList
          title="Expiring within 30 days"
          icon={<CalendarClock />}
          empty="No batches on the shelf expire in the next 30 days."
          loading={alerts.isPending}
          total={alerts.data?.expiringTotal}
        >
          {alerts.data?.expiring.map((p) => {
            const days = daysUntil(p.expiryDate);
            return (
              <li key={p.id}>
                <Link
                  to={`/admin/products/${p.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-paper/70"
                >
                  <span className="min-w-0">
                    <span className="block truncate">{p.name}</span>
                    <span className="text-xs text-ink-faint tabular-nums">
                      {p.stock} on the shelf
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-sm">
                    {p.expired ? (
                      <Badge tone="chilli">Expired</Badge>
                    ) : (
                      <Badge tone={days <= 7 ? 'turmeric' : 'neutral'}>
                        {days === 1 ? 'Tomorrow' : `In ${days} days`}
                      </Badge>
                    )}
                    <span className="w-24 text-right text-ink-soft">
                      {formatDate(p.expiryDate)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </AlertList>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="type-heading text-xl">Stock ledger</h2>
        <div className="max-w-full relative overflow-x-auto">
          <Segmented
            size="sm"
            value={values.reason as '' | StockReason}
            options={REASONS}
            onChange={(reason) => set({ reason })}
          />
        </div>
      </div>
      {values.productId && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-peacock-50 py-1 pr-1 pl-3 text-sm text-peacock-700">
          Showing {filteredProduct ? filteredProduct.name : 'one product'}
          <button
            onClick={() => set({ productId: '' })}
            className="grid size-6 place-items-center rounded-full hover:bg-peacock-100"
            aria-label="Show all products"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {movements.isError && (
        <ErrorState error={movements.error} onRetry={() => movements.refetch()} />
      )}

      <Panel className="overflow-hidden">
        <Table>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Product</Th>
              <Th>Reason</Th>
              <Th className="text-right">Change</Th>
              <Th className="text-right">Balance</Th>
              <Th>Note</Th>
              <Th>By</Th>
            </tr>
          </thead>
          <tbody>
            {movements.isPending ? (
              <SkeletonRows cols={7} />
            ) : (
              movements.data?.items.map((m) => (
                <tr key={m.id}>
                  <Td className="whitespace-nowrap text-ink-soft">{formatDateTime(m.createdAt)}</Td>
                  <Td className="max-w-64">
                    <Link
                      to={`/admin/products/${m.product.id}`}
                      className="block truncate hover:text-peacock-600"
                    >
                      {m.product.name}
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap">{label(m.reason)}</Td>
                  <Td
                    className={cn(
                      'text-right font-medium tabular-nums',
                      m.delta > 0 ? 'text-leaf-600' : 'text-chilli-600',
                    )}
                  >
                    {m.delta > 0 ? '+' : '−'}
                    {Math.abs(m.delta)}
                  </Td>
                  <Td className="text-right tabular-nums">{m.balanceAfter}</Td>
                  <Td className="max-w-56 truncate text-ink-soft">{m.note ?? ''}</Td>
                  <Td className="whitespace-nowrap text-ink-soft">
                    {m.user?.name ?? 'Online shop'}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
        {movements.data && movements.data.items.length === 0 && (
          <EmptyState icon={<Boxes />} title="No stock movements">
            Sales, deliveries, returns and adjustments are recorded here as they happen.
          </EmptyState>
        )}
        {movements.data && (
          <Pagination
            page={movements.data.page}
            totalPages={movements.data.totalPages}
            total={movements.data.total}
            onPage={(p) => set({ page: p })}
          />
        )}
      </Panel>
    </>
  );
}
