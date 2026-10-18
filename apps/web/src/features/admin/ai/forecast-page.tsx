import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  CircleCheck,
  ClipboardList,
  OctagonAlert,
  Search,
  TriangleAlert,
  WandSparkles,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import type {
  CopilotEvent,
  ForecastRisk,
  ForecastRowDTO,
  ForecastSummaryDTO,
  PurchaseOrderDTO,
} from '@quickbill/shared';
import { Button } from '@/components/ui/button';
import {
  Badge,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  Skeleton,
  Table,
  Td,
  Th,
} from '@/components/ui/display';
import { Input, Segmented, Select } from '@/components/ui/form';
import { Tooltip } from '@/components/ui/overlay';
import { api, ApiError, streamEvents } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate, formatINR, formatNumber, formatRelative } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { useAiStatus } from './ai-status';
import { AiMarkdown } from './markdown';
import { DemandSparkline } from './sparkline';

type RiskFilter = 'at_risk' | 'critical' | 'warning' | 'all';

interface DraftResult {
  created: PurchaseOrderDTO[];
  skipped: { productId: string; name: string; reason: string }[];
}

const RISK_BADGE: Record<
  ForecastRisk,
  { tone: 'chilli' | 'turmeric' | 'leaf'; label: string; Icon: typeof OctagonAlert }
> = {
  critical: { tone: 'chilli', label: 'Critical', Icon: OctagonAlert },
  warning: { tone: 'turmeric', label: 'Reorder soon', Icon: TriangleAlert },
  ok: { tone: 'leaf', label: 'Healthy', Icon: CircleCheck },
};

function RiskBadge({ risk }: { risk: ForecastRisk }) {
  const { tone, label, Icon } = RISK_BADGE[risk];
  return (
    <Badge tone={tone}>
      <Icon className="size-3.5" aria-hidden />
      {label}
    </Badge>
  );
}

function selectable(row: ForecastRowDTO) {
  return row.suggestedQty > 0 && row.supplier !== null;
}

function StockoutCell({ row }: { row: ForecastRowDTO }) {
  if (row.stock <= 0) return <span className="font-medium text-chilli-600">Out now</span>;
  if (!row.stockoutDate) return <span className="text-ink-faint">Beyond 4 months</span>;
  return (
    <span className="whitespace-nowrap">
      {formatDate(row.stockoutDate, { weekday: 'short', day: 'numeric', month: 'short' })}
    </span>
  );
}

// ── Briefing ─────────────────────────────────────────────────────────────────

function Briefing({ llm }: { llm: boolean | undefined }) {
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'writing' | 'done' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  const write = async () => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setText('');
    setError(null);
    setState('writing');
    try {
      await streamEvents<CopilotEvent>(
        '/ai/forecast/briefing',
        {},
        (event) => {
          if (event.type === 'text') setText((t) => t + event.delta);
          if (event.type === 'error') setError(event.message);
        },
        abort.signal,
      );
      setState((s) => (s === 'writing' ? 'done' : s));
    } catch (err) {
      if (abort.signal.aborted) return;
      setError(
        err instanceof ApiError ? err.message : 'The briefing could not be written. Try again.',
      );
      setState('failed');
    }
  };

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <h2 className="type-heading text-lg">Today's briefing</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Claude turns the forecast below into a short buying plan, grouped by supplier. It only
            narrates; every number comes from the forecast.
          </p>
        </div>
        {llm === false ? (
          <Tooltip content="Add ANTHROPIC_API_KEY to apps/api/.env and restart the API to enable briefings">
            <span>
              <Button variant="secondary" disabled>
                <WandSparkles /> Write today's briefing
              </Button>
            </span>
          </Tooltip>
        ) : (
          <Button variant="secondary" onClick={() => void write()} loading={state === 'writing'}>
            {state !== 'writing' && <WandSparkles className="text-peacock-600" />}
            {state === 'done'
              ? 'Write it again'
              : state === 'writing'
                ? 'Writing'
                : "Write today's briefing"}
          </Button>
        )}
      </div>
      {llm === false && (
        <p className="mt-3 text-sm text-ink-faint">
          Briefings need a Claude API key. The forecast itself is statistical and works without one.
        </p>
      )}
      {(text || error) && (
        <div className="mt-5 border-t border-line pt-5">
          {text && <AiMarkdown text={text} className="max-w-[72ch]" />}
          {error && <p className="mt-3 text-sm text-chilli-700">{error}</p>}
        </div>
      )}
    </Panel>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ForecastPage() {
  useDocumentTitle('Reorder forecast');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const status = useAiStatus();
  const [risk, setRisk] = useState<RiskFilter>('at_risk');
  const [supplierId, setSupplierId] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const forecast = useQuery({
    queryKey: ['ai', 'forecast'],
    queryFn: () => api.get<ForecastSummaryDTO>('/ai/forecast'),
  });

  const suppliers = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of forecast.data?.rows ?? [])
      if (r.supplier) map.set(r.supplier.id, r.supplier.name);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [forecast.data]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (forecast.data?.rows ?? []).filter(
      (r) =>
        (risk === 'all' || (risk === 'at_risk' ? r.risk !== 'ok' : r.risk === risk)) &&
        (!supplierId || r.supplier?.id === supplierId) &&
        (!q || r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q)),
    );
  }, [forecast.data, risk, supplierId, search]);

  const selectableRows = rows.filter(selectable);
  const allSelected =
    selectableRows.length > 0 && selectableRows.every((r) => selected.has(r.productId));
  const selectedRows = (forecast.data?.rows ?? []).filter((r) => selected.has(r.productId));
  const selectedValue = selectedRows.reduce((s, r) => s + r.suggestedQty * r.unitCost, 0);
  const supplierCount = new Set(selectedRows.map((r) => r.supplier?.id)).size;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of selectableRows) {
        if (allSelected) next.delete(r.productId);
        else next.add(r.productId);
      }
      return next;
    });

  const draft = useMutation({
    mutationFn: (productIds: string[]) =>
      api.post<DraftResult>('/ai/forecast/purchase-orders', { productIds }),
    onSuccess: (result) => {
      setSelected(new Set());
      void qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      const n = result.created.length;
      if (n > 0) {
        toast.success(`Drafted ${n} purchase ${n === 1 ? 'order' : 'orders'}`, {
          description: 'Review and place them from Purchase orders.',
          action: { label: 'Open', onClick: () => navigate('/admin/purchasing') },
        });
      }
      if (result.skipped.length > 0) {
        toast.warning(`${result.skipped.length} skipped: no supplier assigned`, {
          description: result.skipped.map((s) => s.name).join(', '),
        });
      }
    },
  });

  const data = forecast.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reorder forecast"
        description="Expected demand for the next two weeks, and how much to order so shelves don't run empty before the next delivery."
        actions={
          <Button
            disabled={selected.size === 0}
            loading={draft.isPending}
            onClick={() => draft.mutate([...selected])}
          >
            <ClipboardList />
            {selected.size === 0
              ? 'Draft purchase orders'
              : `Draft ${supplierCount} ${supplierCount === 1 ? 'order' : 'orders'} for ${selected.size} ${selected.size === 1 ? 'product' : 'products'}`}
          </Button>
        }
      />

      {forecast.error ? (
        <ErrorState error={forecast.error} onRetry={() => void forecast.refetch()} />
      ) : (
        <Panel className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            {
              icon: <OctagonAlert className="size-5 text-chilli-600" aria-hidden />,
              value: data ? formatNumber(data.totals.critical) : null,
              label: 'Critical',
              hint: 'will run out before a new delivery could arrive',
            },
            {
              icon: <TriangleAlert className="size-5 text-turmeric-600" aria-hidden />,
              value: data ? formatNumber(data.totals.warning) : null,
              label: 'Reorder soon',
              hint: 'at or below the reorder point',
            },
            {
              icon: <ClipboardList className="size-5 text-peacock-600" aria-hidden />,
              value: data ? formatINR(data.totals.reorderValue) : null,
              label: 'Suggested order value',
              hint: 'for both groups, at current cost prices',
            },
          ].map((item) => (
            <div key={item.label} className="flex gap-3 p-5">
              {item.icon}
              <div className="min-w-0">
                <p className="text-sm text-ink-soft">{item.label}</p>
                {item.value === null ? (
                  <Skeleton className="mt-1 h-8 w-24" />
                ) : (
                  <p className="type-heading mt-0.5 text-[28px] tabular-nums">{item.value}</p>
                )}
                <p className="text-[13px] text-ink-faint">{item.hint}</p>
              </div>
            </div>
          ))}
        </Panel>
      )}

      <Briefing llm={status.data?.llm} />

      <details className="group rounded-2xl border border-line bg-surface px-5 py-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden">
          How this forecast works
          <ChevronDown className="size-4 text-ink-faint transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3 grid gap-4 text-sm text-ink-soft md:grid-cols-3">
          <p>
            <span className="font-medium text-ink">Demand.</span> Eight weeks of daily sales, in
            store and online, are adjusted for the day of the week (weekends sell more) and smoothed
            with Holt's exponential smoothing, which follows both the level and the trend.
          </p>
          <p>
            <span className="font-medium text-ink">Safety stock.</span> Extra stock is held against
            how wrong past forecasts were, sized for a 95% chance of not running out during the
            supplier's lead time.
          </p>
          <p>
            <span className="font-medium text-ink">Order size.</span> Each suggestion covers the
            lead time plus a week (a day for next-day suppliers), minus stock on the shelf and stock
            already on order. Days of sold-out shelves look like low demand, so check those rows.
          </p>
        </div>
      </details>

      <Panel>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <Segmented<RiskFilter>
            value={risk}
            onChange={setRisk}
            options={[
              { value: 'at_risk', label: 'At risk' },
              { value: 'critical', label: 'Critical' },
              { value: 'warning', label: 'Reorder soon' },
              { value: 'all', label: 'All products' },
            ]}
          />
          <Select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-56"
            aria-label="Filter by supplier"
          >
            <option value="">All suppliers</option>
            {suppliers.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a product"
              className="pl-9"
              aria-label="Find a product"
            />
          </div>
          {data && (
            <p className="text-[13px] text-ink-faint">Updated {formatRelative(data.generatedAt)}</p>
          )}
        </div>

        {forecast.isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<CircleCheck />}
            title={risk === 'all' ? 'No products match' : 'Nothing needs reordering'}
          >
            {risk === 'all'
              ? 'Try a different supplier or search.'
              : 'Every product in this view has enough stock to last until its next delivery.'}
          </EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-10">
                  <input
                    type="checkbox"
                    className="size-4 accent-peacock-600"
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={selectableRows.length === 0}
                    aria-label="Select all products that can be ordered"
                  />
                </Th>
                <Th>Product</Th>
                <Th>Supplier</Th>
                <Th className="text-right">In stock</Th>
                <Th className="text-right">On order</Th>
                <Th className="text-right">Forecast a day</Th>
                <Th>Days of cover</Th>
                <Th>Status and run-out date</Th>
                <Th className="pr-5 text-right">Suggested order</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const canSelect = selectable(row);
                const checkbox = (
                  <input
                    type="checkbox"
                    className="size-4 accent-peacock-600 disabled:opacity-30"
                    checked={selected.has(row.productId)}
                    onChange={() => toggle(row.productId)}
                    disabled={!canSelect}
                    aria-label={`Select ${row.name}`}
                  />
                );
                return (
                  <tr
                    key={row.productId}
                    className={cn(
                      'transition-colors hover:bg-paper/60',
                      selected.has(row.productId) && 'bg-peacock-50/50',
                    )}
                  >
                    <Td>
                      {canSelect ? (
                        checkbox
                      ) : (
                        <Tooltip
                          content={
                            row.supplier
                              ? 'Nothing to order'
                              : 'Assign a supplier to order this product'
                          }
                        >
                          <span>{checkbox}</span>
                        </Tooltip>
                      )}
                    </Td>
                    <Td className="min-w-44">
                      <p className="font-medium text-ink">{row.name}</p>
                      <p className="text-[13px] text-ink-faint">
                        {row.category}, {row.sku}
                      </p>
                    </Td>
                    <Td className="min-w-36">
                      {row.supplier ? (
                        <>
                          <p className="text-ink">{row.supplier.name}</p>
                          <p className="text-[13px] text-ink-faint">
                            {row.leadTimeDays}-day delivery
                          </p>
                        </>
                      ) : (
                        <span className="text-ink-faint">No supplier</span>
                      )}
                    </Td>
                    <Td
                      className={cn(
                        'text-right tabular-nums',
                        row.stock <= 0 && 'font-medium text-chilli-600',
                      )}
                    >
                      {formatNumber(row.stock)}
                    </Td>
                    <Td className="text-right text-ink-soft tabular-nums">
                      {row.onOrder ? formatNumber(row.onOrder) : '—'}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatNumber(row.forecastDailyDemand, 1)}
                      {Math.abs(row.trend) >= 0.15 && (
                        <span
                          className={cn(
                            'ml-1 text-[13px]',
                            row.trend > 0 ? 'text-leaf-600' : 'text-ink-faint',
                          )}
                          title="Change in the last 7 days versus the 7 before"
                        >
                          {row.trend > 0 ? '+' : '−'}
                          {Math.round(Math.abs(row.trend) * 100)}%
                        </span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-3">
                        <DemandSparkline history={row.history} forecast={row.forecast} />
                        <span className="w-14 text-right tabular-nums">
                          {row.daysOfCover === null ? '—' : `${formatNumber(row.daysOfCover, 1)} d`}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <RiskBadge risk={row.risk} />
                      <p className="mt-1 text-[13px] text-ink-soft">
                        <StockoutCell row={row} />
                      </p>
                    </Td>
                    <Td className="pr-5 text-right tabular-nums">
                      {row.suggestedQty > 0 ? (
                        <>
                          <p className="font-medium text-ink">{formatNumber(row.suggestedQty)}</p>
                          <p className="text-[13px] text-ink-faint">
                            {formatINR(row.suggestedQty * row.unitCost)}
                          </p>
                        </>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}

        {selected.size > 0 && (
          <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur">
            <p className="text-sm text-ink-soft">
              <span className="font-medium text-ink">{selected.size}</span> selected, about{' '}
              <span className="font-medium text-ink tabular-nums">{formatINR(selectedValue)}</span>{' '}
              at cost
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                Clear selection
              </Button>
              <Button
                size="sm"
                loading={draft.isPending}
                onClick={() => draft.mutate([...selected])}
              >
                Draft purchase orders
              </Button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
