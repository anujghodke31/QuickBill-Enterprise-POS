import type { ChartSpec } from '@quickbill/shared';
import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatINR, formatNumber, formatRupees } from '@/lib/format';

/**
 * Categorical chart palette, validated for colour-vision deficiency separation,
 * chroma and 3:1 contrast on white (dataviz validator). Assigned in this fixed
 * order; series beyond five fold into "Other".
 */
export const SERIES = ['#008c99', '#c98500', '#6e4fc4', '#d9668f', '#2f7fd0'] as const;
export const OTHER = '#a7a5b6';

const AXIS = { fontSize: 12, fill: '#85839a' };
const GRID = '#eceef2';

export type ValueFormat = 'paise' | 'rupees' | 'number' | 'percent';

export function formatValue(value: number, format: ValueFormat, compact = false): string {
  switch (format) {
    case 'paise':
      // Charts read better in whole rupees; exact paise belong on bills.
      return compact ? formatINR(value, { compact }) : formatRupees(value);
    case 'rupees':
      return formatINR(value * 100, { compact });
    case 'percent':
      return `${(value <= 1 && value >= -1 ? value * 100 : value).toFixed(1)}%`;
    default:
      return compact && Math.abs(value) >= 1000
        ? new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(
            value,
          )
        : formatNumber(value, 1);
  }
}

interface TooltipRow {
  dataKey?: unknown;
  name?: unknown;
  value?: unknown;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  format,
  formatLabel,
}: {
  active?: boolean;
  payload?: readonly TooltipRow[];
  label?: unknown;
  format: ValueFormat;
  formatLabel?: (label: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lift">
      <p className="mb-1 font-medium text-ink">
        {formatLabel ? formatLabel(String(label)) : String(label)}
      </p>
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-ink-soft">
            <span className="size-2 rounded-full" style={{ background: p.color }} />
            {String(p.name ?? '')}
          </span>
          <span className="font-medium text-ink tabular-nums">
            {formatValue(Number(p.value), format)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  if (items.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-soft">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

interface SeriesDef {
  key: string;
  label: string;
}

/** Bar, line or area chart over a categorical or time x-axis, with a single y-scale. */
export function CartesianChart({
  kind,
  data,
  xKey,
  series,
  format,
  height = 240,
  stacked = false,
  xFormatter,
  tooltipLabel,
}: {
  kind: 'bar' | 'line' | 'area';
  data: Record<string, string | number>[];
  xKey: string;
  series: SeriesDef[];
  format: ValueFormat;
  height?: number;
  stacked?: boolean;
  xFormatter?: (value: string) => string;
  tooltipLabel?: (value: string) => string;
}) {
  const shown = series.slice(0, SERIES.length);
  const common = {
    data,
    margin: { top: 8, right: 4, bottom: 0, left: 4 },
  };
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke={GRID} />
      <XAxis
        dataKey={xKey}
        tickLine={false}
        axisLine={false}
        tick={AXIS}
        tickFormatter={xFormatter}
        minTickGap={16}
        interval="preserveStartEnd"
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        tick={AXIS}
        width={64}
        tickFormatter={(v: number) => formatValue(v, format, true)}
      />
      <Tooltip
        cursor={kind === 'bar' ? { fill: 'rgb(29 27 47 / 0.04)' } : { stroke: '#cdd0d9' }}
        content={({ active, payload, label }) => (
          <ChartTooltip
            active={active}
            payload={payload}
            label={label}
            format={format}
            formatLabel={tooltipLabel ?? xFormatter}
          />
        )}
      />
    </>
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      {kind === 'bar' ? (
        <BarChart {...common} barCategoryGap="18%">
          {axes}
          {shown.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={SERIES[i]}
              stackId={stacked ? 'stack' : undefined}
              stroke="#fff"
              strokeWidth={stacked ? 1 : 0}
              radius={!stacked || i === shown.length - 1 ? [4, 4, 0, 0] : 0}
              maxBarSize={48}
            />
          ))}
        </BarChart>
      ) : kind === 'line' ? (
        <LineChart {...common}>
          {axes}
          {shown.map((s, i) => (
            <Line
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stroke={SERIES[i]}
              strokeWidth={2}
              dot={data.length <= 14 ? { r: 4, strokeWidth: 2, fill: '#fff' } : false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
              type="monotone"
            />
          ))}
        </LineChart>
      ) : (
        <AreaChart {...common}>
          {axes}
          {shown.map((s, i) => (
            <Area
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stroke={SERIES[i]}
              strokeWidth={2}
              fill={SERIES[i]}
              fillOpacity={0.12}
              stackId={stacked ? 'stack' : undefined}
              type="monotone"
            />
          ))}
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}

/** Donut for a part-to-whole split; anything past five slices folds into "Other". */
export function DonutChart({
  data,
  format,
  size = 180,
  center,
}: {
  data: { label: string; value: number }[];
  format: ValueFormat;
  size?: number;
  center?: ReactNode;
}) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, SERIES.length);
  const tail = sorted.slice(SERIES.length);
  const slices = tail.length
    ? [...head, { label: 'Other', value: tail.reduce((s, d) => s + d.value, 0) }]
    : head;
  const total = slices.reduce((s, d) => s + d.value, 0);
  const color = (i: number) => (i < SERIES.length ? SERIES[i]! : OTHER);

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius="64%"
              outerRadius="100%"
              paddingAngle={1.5}
              stroke="#fff"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((s, i) => (
                <Cell key={s.label} fill={color(i)} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload, label }) => (
                <ChartTooltip active={active} payload={payload} label={label} format={format} />
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        {center && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            {center}
          </div>
        )}
      </div>
      <ul className="min-w-40 flex-1 space-y-1.5 text-sm">
        {slices.map((s, i) => (
          <li key={s.label} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-ink-soft">
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: color(i) }} />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="text-ink tabular-nums">
              {total ? `${Math.round((s.value / total) * 100)}%` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ranked horizontal bars drawn in HTML, with the value as a direct label. */
export function BarList({
  items,
  format,
  color = SERIES[0],
}: {
  items: { label: ReactNode; value: number; key: string; hint?: ReactNode }[];
  format: ValueFormat;
  color?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink">{item.label}</span>
            <span className="shrink-0 text-ink tabular-nums">
              {formatValue(item.value, format)}
              {item.hint && <span className="ml-1.5 text-ink-faint">{item.hint}</span>}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-ink/[0.06]">
            <div
              className="h-full rounded-full"
              style={{ width: `${(item.value / max) * 100}%`, background: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Renders a chart the AI copilot asked for. Copilot currency values are rupees. */
export function SpecChart({ spec }: { spec: ChartSpec }) {
  const format: ValueFormat =
    spec.valueFormat === 'currency'
      ? 'rupees'
      : spec.valueFormat === 'percent'
        ? 'percent'
        : 'number';
  return (
    <figure className="rounded-xl border border-line bg-surface p-4">
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-ink">{spec.title}</span>
        <Legend
          items={spec.series
            .slice(0, SERIES.length)
            .map((s, i) => ({ label: s.label, color: SERIES[i]! }))}
        />
      </figcaption>
      {spec.kind === 'pie' ? (
        <DonutChart
          data={spec.data.map((d) => ({
            label: String(d[spec.xKey]),
            value: Number(d[spec.series[0]!.key] ?? 0),
          }))}
          format={format}
        />
      ) : (
        <CartesianChart
          kind={spec.kind}
          data={spec.data}
          xKey={spec.xKey}
          series={spec.series}
          format={format}
          height={220}
        />
      )}
    </figure>
  );
}
