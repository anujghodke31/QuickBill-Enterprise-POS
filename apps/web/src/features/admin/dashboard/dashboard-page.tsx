import { useQuery } from '@tanstack/react-query';
import { CalendarClock, PackageX, ScanBarcode, ShoppingBag, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router';
import type { DashboardDTO } from '@quickbill/shared';
import { BarList, CartesianChart, DonutChart, Legend, SERIES } from '@/components/charts';
import { Button } from '@/components/ui/button';
import {
  ErrorState,
  PageHeader,
  Panel,
  SectionTitle,
  Skeleton,
  Table,
  Td,
  Th,
} from '@/components/ui/display';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatINR, formatPercent, formatRupees, formatTime, label } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { useAuth } from '@/stores/auth';

/** Rolls category revenue up to the five store departments for a readable split. */
function byDepartment(mix: DashboardDTO['categoryMix']) {
  const totals = new Map<string, number>();
  for (const c of mix) totals.set(c.department, (totals.get(c.department) ?? 0) + c.revenue);
  return [...totals].map(([label, value]) => ({ label, value }));
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** One figure on the day's till strip, with yesterday's full-day number beneath it. */
function TillFigure({
  title,
  value,
  yesterday,
}: {
  title: string;
  value: string;
  yesterday: string;
}) {
  return (
    <div className="px-5 py-4 first:pl-0 sm:px-6">
      <p className="text-sm text-ink-soft">{title}</p>
      <p className="type-display mt-1 text-[40px] text-ink tabular-nums">{value}</p>
      <p className="mt-1 text-[13px] text-ink-faint tabular-nums">Yesterday {yesterday}</p>
    </div>
  );
}

function AttentionItem({
  icon: Icon,
  tone,
  to,
  title,
  children,
}: {
  icon: LucideIcon;
  tone: 'chilli' | 'turmeric' | 'peacock';
  to: string;
  title: string;
  children: ReactNode;
}) {
  const tones = {
    chilli: 'bg-chilli-50 text-chilli-600',
    turmeric: 'bg-turmeric-100 text-turmeric-800',
    peacock: 'bg-peacock-50 text-peacock-700',
  };
  return (
    <Link to={to} className="flex gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-paper">
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', tones[tone])}>
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-ink">{title}</span>
        <span className="block text-sm text-ink-soft">{children}</span>
      </span>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const user = useAuth((s) => s.user)!;
  const { data, error, refetch, isPending } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardDTO>('/analytics/dashboard'),
    refetchInterval: 60_000,
    enabled: user.role !== 'CASHIER',
  });

  if (user.role === 'CASHIER') return <Navigate to="/admin/pos" replace />;

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.name.split(' ')[0]}`}
        description={`Here is how QuickBill Mart is doing on ${today}.`}
        actions={
          <Button asChild>
            <Link to="/admin/pos">
              <ScanBarcode /> Open the till
            </Link>
          </Button>
        }
      />

      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {isPending && <DashboardSkeleton />}

      {data && (
        <div className="space-y-6">
          {/* Today's till, read like an end-of-day summary slip. */}
          <Panel className="grid grid-cols-2 divide-line px-5 sm:px-6 lg:grid-cols-4 lg:divide-x">
            <TillFigure
              title="Sales today"
              value={formatRupees(data.today.revenue)}
              yesterday={formatRupees(data.yesterday.revenue)}
            />
            <TillFigure
              title="Bills and orders"
              value={data.today.transactions.toLocaleString('en-IN')}
              yesterday={data.yesterday.transactions.toLocaleString('en-IN')}
            />
            <TillFigure
              title="Average basket"
              value={formatRupees(data.today.avgBasket)}
              yesterday={formatRupees(data.yesterday.avgBasket)}
            />
            <TillFigure
              title="Gross margin"
              value={formatPercent(data.today.grossMargin)}
              yesterday={formatPercent(data.yesterday.grossMargin)}
            />
          </Panel>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Panel className="p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="type-heading text-lg">Sales, last 30 days</h2>
                  <p className="text-sm text-ink-soft">
                    {formatRupees(data.last30.revenue)} from{' '}
                    {data.last30.transactions.toLocaleString('en-IN')} bills and orders
                  </p>
                </div>
                <Legend
                  items={[
                    { label: 'In store', color: SERIES[0] },
                    { label: 'Online', color: SERIES[1] },
                  ]}
                />
              </div>
              <CartesianChart
                kind="bar"
                stacked
                data={data.revenueSeries}
                xKey="date"
                series={[
                  { key: 'pos', label: 'In store' },
                  { key: 'online', label: 'Online' },
                ]}
                format="paise"
                height={260}
                xFormatter={shortDate}
              />
            </Panel>

            <Panel className="p-3">
              <h2 className="type-heading px-3 pt-2 pb-1 text-lg">Needs attention</h2>
              <div className="space-y-1">
                <AttentionItem
                  icon={PackageX}
                  tone="chilli"
                  to="/admin/forecast"
                  title={`${data.lowStockCount} products at or below reorder level`}
                >
                  {data.lowStock
                    .slice(0, 3)
                    .map((p) => `${p.name} (${p.stock})`)
                    .join(', ')}
                </AttentionItem>
                <AttentionItem
                  icon={CalendarClock}
                  tone="turmeric"
                  to="/admin/inventory"
                  title={`${data.expiringCount} batches expiring within 30 days`}
                >
                  Move them to the front shelf or mark them down.
                </AttentionItem>
                <AttentionItem
                  icon={ShoppingBag}
                  tone="peacock"
                  to="/admin/orders"
                  title={`${data.pendingOrders} online orders to pack and ship`}
                >
                  Pending, confirmed and packed orders.
                </AttentionItem>
              </div>
              <div className="mx-3 mt-3 rounded-xl bg-paper px-4 py-3 text-sm text-ink-soft">
                The{' '}
                <Link to="/admin/forecast" className="font-medium text-peacock-600 hover:underline">
                  reorder forecast
                </Link>{' '}
                turns these into suggested purchase orders.
              </div>
            </Panel>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <Panel className="p-5 sm:p-6">
              <SectionTitle
                action={
                  <Link to="/admin/products" className="text-sm text-peacock-600 hover:underline">
                    All products
                  </Link>
                }
              >
                Top sellers, 30 days
              </SectionTitle>
              <BarList
                format="paise"
                items={data.topProducts.map((p) => ({
                  key: p.productId,
                  label: p.name,
                  value: p.revenue,
                  hint: `${p.units} sold`,
                }))}
              />
            </Panel>

            <Panel className="p-5 sm:p-6">
              <SectionTitle>Sales by aisle</SectionTitle>
              <DonutChart format="paise" size={160} data={byDepartment(data.categoryMix)} />
            </Panel>

            <Panel className="p-5 sm:p-6 md:col-span-2 xl:col-span-1">
              <SectionTitle>Busiest hours</SectionTitle>
              <p className="-mt-2 mb-3 text-sm text-ink-soft">
                Average sales per hour, last 30 days
              </p>
              <CartesianChart
                kind="bar"
                data={data.hourly.map((h) => ({
                  hour: `${h.hour % 12 || 12}${h.hour < 12 ? 'am' : 'pm'}`,
                  revenue: Math.round(h.revenue / 30),
                }))}
                xKey="hour"
                series={[{ key: 'revenue', label: 'Average sales' }]}
                format="paise"
                height={200}
              />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Panel>
              <div className="flex items-center justify-between px-5 pt-5 pb-3 sm:px-6">
                <h2 className="type-heading text-lg">Latest bills</h2>
                <Link to="/admin/sales" className="text-sm text-peacock-600 hover:underline">
                  All bills
                </Link>
              </div>
              <Table>
                <thead>
                  <tr>
                    <Th className="pl-5 sm:pl-6">Bill</Th>
                    <Th>Time</Th>
                    <Th>Customer</Th>
                    <Th>Payment</Th>
                    <Th className="pr-5 text-right sm:pr-6">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSales.map((s) => (
                    <tr key={s.id} className="hover:bg-paper/60">
                      <Td className="pl-5 sm:pl-6">
                        <Link
                          to={`/admin/sales/${s.id}`}
                          className="font-medium hover:text-peacock-600"
                        >
                          {s.number}
                        </Link>
                      </Td>
                      <Td className="text-ink-soft tabular-nums">{formatTime(s.createdAt)}</Td>
                      <Td className="text-ink-soft">{s.customerName ?? 'Walk-in'}</Td>
                      <Td className="text-ink-soft">{label(s.paymentMethod)}</Td>
                      <Td className="pr-5 text-right font-medium tabular-nums sm:pr-6">
                        {formatINR(s.total)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Panel>

            <Panel className="p-5 sm:p-6">
              <SectionTitle>How customers pay</SectionTitle>
              <BarList
                format="paise"
                color={SERIES[2]}
                items={data.paymentMix.map((p) => ({
                  key: p.method,
                  label: label(p.method),
                  value: p.revenue,
                  hint: `${p.count} bills`,
                }))}
              />
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
