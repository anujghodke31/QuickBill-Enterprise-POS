import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { ChartSpec } from '@quickbill/shared';
import { daysBetween, localDate, localDayRange } from '../../../lib/dates';
import { prisma } from '../../../lib/prisma';
import { escapeLike } from '../../../lib/text';
import * as analytics from '../../analytics/analytics.service';
import { buildForecast } from '../forecast/forecast.service';

// Every tool is read-only and goes through the same parameterised analytics
// functions as the dashboard. There is deliberately no free-form SQL tool.

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const MAX_RANGE_DAYS = 400;

function range(start: string, end: string) {
  if (start > end) throw new Error('start_date must be on or before end_date');
  if (daysBetween(start, end) > MAX_RANGE_DAYS)
    throw new Error(`Date range is limited to ${MAX_RANGE_DAYS} days`);
  return localDayRange(start, end);
}

/** Tool results report money in rupees, which models reason about more reliably than paise. */
const rupees = (paise: number) => Math.round(paise) / 100;

function withRupees<T extends Record<string, unknown>>(row: T, keys: string[]) {
  const out: Record<string, unknown> = { ...row };
  for (const key of keys) {
    if (typeof out[key] === 'number') out[key] = rupees(out[key] as number);
  }
  return out;
}

const dateProps = {
  start_date: {
    type: 'string',
    description: 'First day, inclusive (YYYY-MM-DD, store local time)',
  },
  end_date: { type: 'string', description: 'Last day, inclusive (YYYY-MM-DD, store local time)' },
} as const;

const showChartSchema = z.object({
  kind: z.enum(['bar', 'line', 'area', 'pie']),
  title: z.string().min(1).max(120),
  x_key: z.string().min(1),
  series: z
    .array(z.object({ key: z.string(), label: z.string() }))
    .min(1)
    .max(4),
  data: z
    .array(z.record(z.string(), z.union([z.string(), z.number()])))
    .min(1)
    .max(60),
  value_format: z.enum(['currency', 'number', 'percent']),
});

interface ToolDef<S extends z.ZodType> {
  name: string;
  description: string;
  input_schema: Anthropic.Beta.BetaTool.InputSchema;
  schema: S;
  label: (input: z.infer<S>) => string;
  run: (input: z.infer<S>) => Promise<unknown>;
}

const tool = <S extends z.ZodType>(def: ToolDef<S>) => def;

export const TOOLS = [
  tool({
    name: 'get_sales_summary',
    description:
      'Revenue, number of bills/orders, average basket, items sold and gross margin for a date range, optionally broken down by day, week or month. Covers in-store (pos) and online sales.',
    input_schema: {
      type: 'object',
      properties: {
        ...dateProps,
        group_by: { type: 'string', enum: ['none', 'day', 'week', 'month'] },
        channel: { type: 'string', enum: ['all', 'pos', 'online'] },
      },
      required: ['start_date', 'end_date'],
    },
    schema: z.object({
      start_date: isoDate,
      end_date: isoDate,
      group_by: z.enum(['none', 'day', 'week', 'month']).default('none'),
      channel: z.enum(['all', 'pos', 'online']).default('all'),
    }),
    label: (i) => `Summarising sales ${i.start_date} → ${i.end_date}`,
    run: async (i) => {
      const r = range(i.start_date, i.end_date);
      const kpis = await analytics.getKpis(r, i.channel);
      const summary = withRupees({ ...kpis }, ['revenue', 'avgBasket']);
      if (i.group_by === 'none') return { summary };
      const series = await analytics.getRevenueSeries(r, i.group_by, i.channel);
      return {
        summary,
        series: series.map((s) => withRupees(s, ['pos', 'online', 'total'])),
      };
    },
  }),

  tool({
    name: 'get_top_products',
    description:
      'Best-selling products in a date range ranked by revenue, units or gross margin. Optionally filter to one category or department name.',
    input_schema: {
      type: 'object',
      properties: {
        ...dateProps,
        rank_by: { type: 'string', enum: ['revenue', 'units', 'margin'] },
        limit: { type: 'integer', minimum: 1, maximum: 25 },
        category: { type: 'string', description: 'Category or department name, e.g. "Dairy"' },
        channel: { type: 'string', enum: ['all', 'pos', 'online'] },
      },
      required: ['start_date', 'end_date'],
    },
    schema: z.object({
      start_date: isoDate,
      end_date: isoDate,
      rank_by: z.enum(['revenue', 'units', 'margin']).default('revenue'),
      limit: z.number().int().min(1).max(25).default(10),
      category: z.string().max(60).optional(),
      channel: z.enum(['all', 'pos', 'online']).default('all'),
    }),
    label: (i) => `Ranking products by ${i.rank_by}`,
    run: async (i) => {
      const rows = await analytics.getTopProducts(range(i.start_date, i.end_date), {
        limit: i.limit,
        rankBy: i.rank_by,
        category: i.category,
        channel: i.channel,
      });
      return rows.map((r) => withRupees(r, ['revenue', 'margin']));
    },
  }),

  tool({
    name: 'get_category_performance',
    description:
      'Revenue, units and margin percentage per category (with department) for a date range.',
    input_schema: {
      type: 'object',
      properties: { ...dateProps },
      required: ['start_date', 'end_date'],
    },
    schema: z.object({ start_date: isoDate, end_date: isoDate }),
    label: () => 'Comparing categories',
    run: async (i) =>
      (await analytics.getCategoryPerformance(range(i.start_date, i.end_date))).map((r) =>
        withRupees(r, ['revenue']),
      ),
  }),

  tool({
    name: 'get_sales_patterns',
    description:
      'How sales are distributed by hour of day, day of week, payment method, or cashier, for a date range.',
    input_schema: {
      type: 'object',
      properties: {
        ...dateProps,
        by: { type: 'string', enum: ['hour', 'weekday', 'payment_method', 'cashier'] },
      },
      required: ['start_date', 'end_date', 'by'],
    },
    schema: z.object({
      start_date: isoDate,
      end_date: isoDate,
      by: z.enum(['hour', 'weekday', 'payment_method', 'cashier']),
    }),
    label: (i) => `Looking at sales by ${i.by.replace('_', ' ')}`,
    run: async (i) => {
      const r = range(i.start_date, i.end_date);
      const rows =
        i.by === 'hour'
          ? await analytics.getHourlyPattern(r)
          : i.by === 'weekday'
            ? await analytics.getWeekdayPattern(r)
            : i.by === 'payment_method'
              ? await analytics.getPaymentMix(r)
              : await analytics.getCashierPerformance(r);
      return rows.map((row) => withRupees(row, ['revenue', 'avgBasket']));
    },
  }),

  tool({
    name: 'get_customer_insights',
    description:
      'Customer lists: top_spenders (by spend within the date range), lapsed (regulars with 3+ visits who have not returned in 30 days), new (joined within the date range), loyalty_leaders (most points).',
    input_schema: {
      type: 'object',
      properties: {
        segment: { type: 'string', enum: ['top_spenders', 'lapsed', 'new', 'loyalty_leaders'] },
        limit: { type: 'integer', minimum: 1, maximum: 25 },
        ...dateProps,
      },
      required: ['segment'],
    },
    schema: z.object({
      segment: z.enum(['top_spenders', 'lapsed', 'new', 'loyalty_leaders']),
      limit: z.number().int().min(1).max(25).default(10),
      start_date: isoDate.optional(),
      end_date: isoDate.optional(),
    }),
    label: (i) => `Finding ${i.segment.replace('_', ' ')} customers`,
    run: async (i) => {
      const end = i.end_date ?? localDate();
      const start = i.start_date ?? end.slice(0, 8) + '01';
      const rows = await analytics.getCustomerInsights(i.segment, i.limit, range(start, end));
      return rows.map((r) =>
        withRupees(r as Record<string, unknown>, ['revenue', 'lifetimeSpend']),
      );
    },
  }),

  tool({
    name: 'get_inventory_status',
    description:
      'Current inventory problems: low_stock (at or below reorder point), out_of_stock, expiring_soon (within 30 days), dead_stock (no sales in 30 days), overstock (more than 60 days of cover).',
    input_schema: {
      type: 'object',
      properties: {
        view: {
          type: 'string',
          enum: ['low_stock', 'out_of_stock', 'expiring_soon', 'dead_stock', 'overstock'],
        },
        limit: { type: 'integer', minimum: 1, maximum: 50 },
      },
      required: ['view'],
    },
    schema: z.object({
      view: z.enum(['low_stock', 'out_of_stock', 'expiring_soon', 'dead_stock', 'overstock']),
      limit: z.number().int().min(1).max(50).default(15),
    }),
    label: (i) => `Checking ${i.view.replace(/_/g, ' ')}`,
    run: async (i) =>
      ((await analytics.getInventoryView(i.view, i.limit)) as Record<string, unknown>[]).map((r) =>
        withRupees(r, ['stockValue']),
      ),
  }),

  tool({
    name: 'get_reorder_forecast',
    description:
      'Demand forecast per product (Holt exponential smoothing with weekday seasonality, 95% service level): forecast units/day, days of cover, expected stock-out date, and suggested order quantity.',
    input_schema: {
      type: 'object',
      properties: {
        risk: { type: 'string', enum: ['critical', 'warning', 'at_risk', 'all'] },
        limit: { type: 'integer', minimum: 1, maximum: 40 },
      },
      required: [],
    },
    schema: z.object({
      risk: z.enum(['critical', 'warning', 'at_risk', 'all']).default('at_risk'),
      limit: z.number().int().min(1).max(40).default(15),
    }),
    label: () => 'Running the demand forecast',
    run: async (i) => {
      const forecast = await buildForecast();
      const rows = forecast.rows.filter((r) =>
        i.risk === 'all' ? true : i.risk === 'at_risk' ? r.risk !== 'ok' : r.risk === i.risk,
      );
      return {
        totals: { ...forecast.totals, reorderValue: rupees(forecast.totals.reorderValue) },
        rows: rows.slice(0, i.limit).map((r) => ({
          product: r.name,
          supplier: r.supplier?.name ?? null,
          risk: r.risk,
          stock: r.stock,
          onOrder: r.onOrder,
          forecastPerDay: r.forecastDailyDemand,
          daysOfCover: r.daysOfCover,
          stockoutDate: r.stockoutDate,
          leadTimeDays: r.leadTimeDays,
          suggestedQty: r.suggestedQty,
          orderValue: rupees(r.suggestedQty * r.unitCost),
          weekOverWeekTrend: r.trend,
        })),
      };
    },
  }),

  tool({
    name: 'search_products',
    description:
      'Find products by name, brand, SKU or category. Returns ids (for get_product_performance), price, cost, stock and supplier.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 20 },
      },
      required: ['query'],
    },
    schema: z.object({
      query: z.string().min(1).max(80),
      limit: z.number().int().min(1).max(20).default(8),
    }),
    label: (i) => `Searching products for "${i.query}"`,
    run: async (i) => {
      const pattern = `%${escapeLike(i.query)}%`;
      const rows = await prisma.$queryRaw<
        {
          id: string;
          name: string;
          sku: string;
          category: string;
          price: number;
          costPrice: number;
          stock: number;
          supplier: string | null;
        }[]
      >`
        SELECT p.id, p.name, p.sku, c.name AS category, p.price, p."costPrice", p.stock, s.name AS supplier
        FROM "Product" p
        JOIN "Category" c ON c.id = p."categoryId"
        LEFT JOIN "Supplier" s ON s.id = p."supplierId"
        WHERE p."isActive" AND (
          p.name ILIKE ${pattern} OR p.brand ILIKE ${pattern} OR p.sku ILIKE ${pattern}
          OR c.name ILIKE ${pattern} OR word_similarity(${i.query}, p.name) > 0.45)
        ORDER BY word_similarity(${i.query}, p.name) DESC
        LIMIT ${i.limit}`;
      return rows.map((r) => withRupees(r, ['price', 'costPrice']));
    },
  }),

  tool({
    name: 'get_product_performance',
    description:
      'Daily units and revenue for one product over a date range, with current price, cost, stock and supplier.',
    input_schema: {
      type: 'object',
      properties: { product_id: { type: 'string' }, ...dateProps },
      required: ['product_id', 'start_date', 'end_date'],
    },
    schema: z.object({ product_id: z.string().min(1), start_date: isoDate, end_date: isoDate }),
    label: () => 'Analysing a product',
    run: async (i) => {
      const result = await analytics.getProductPerformance(
        i.product_id,
        range(i.start_date, i.end_date),
      );
      return {
        product: withRupees(result.product, ['price', 'costPrice']),
        totals: withRupees(result.totals, ['revenue']),
        daily: result.daily.map((d) => withRupees(d, ['revenue'])),
      };
    },
  }),

  tool({
    name: 'show_chart',
    description:
      'Display a chart to the user beneath your answer. Use it for trends, rankings and breakdowns. Data must come from earlier tool results. Currency values are in rupees.',
    input_schema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['bar', 'line', 'area', 'pie'] },
        title: { type: 'string' },
        x_key: {
          type: 'string',
          description: 'Field in each data row used for the x-axis or pie labels',
        },
        series: {
          type: 'array',
          items: {
            type: 'object',
            properties: { key: { type: 'string' }, label: { type: 'string' } },
            required: ['key', 'label'],
          },
          description: 'Numeric fields to plot (one for pie charts)',
        },
        data: { type: 'array', items: { type: 'object' } },
        value_format: { type: 'string', enum: ['currency', 'number', 'percent'] },
      },
      required: ['kind', 'title', 'x_key', 'series', 'data', 'value_format'],
    },
    schema: showChartSchema,
    label: (i) => `Drawing "${i.title}"`,
    run: async () => ({ shown: true }),
  }),
];

export type CopilotToolName = (typeof TOOLS)[number]['name'];

export const toolDefinitions: Anthropic.Beta.BetaTool[] = TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.input_schema,
  eager_input_streaming: true,
}));

const byName = new Map(TOOLS.map((t) => [t.name, t as ToolDef<z.ZodType>]));

export function findTool(name: string) {
  return byName.get(name);
}

export function toChartSpec(input: unknown): ChartSpec | null {
  const parsed = showChartSchema.safeParse(input);
  if (!parsed.success) return null;
  const i = parsed.data;
  return {
    kind: i.kind,
    title: i.title,
    xKey: i.x_key,
    series: i.series,
    data: i.data,
    valueFormat: i.value_format,
  };
}
