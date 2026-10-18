import type { DashboardDTO, KpiSnapshot } from '@quickbill/shared';
import { STORE } from '../../config/store';
import { addDays, eachDay, localDate, localDayRange } from '../../lib/dates';
import { notFound } from '../../lib/errors';
import { Prisma, prisma } from '../../lib/prisma';
import { saleSummaryInclude, toSaleSummaryDTO } from '../sales/sales.mappers';

// Analytics run as hand-written SQL over a unified "sales lines" view that merges
// in-store bills and online orders. Every query here is read-only and fully
// parameterised; the AI copilot calls these same functions as its tools.

export type Channel = 'all' | 'pos' | 'online';
export interface Range {
  from: Date;
  to: Date;
}

/** A JS Date as a UTC wall-clock timestamp, matching how Prisma stores DateTime. */
const ts = (d: Date) => Prisma.sql`(${d.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
/** A stored timestamp column converted to store-local wall-clock time. */
const local = (column: string) =>
  Prisma.sql`((${Prisma.raw(column)} AT TIME ZONE 'UTC') AT TIME ZONE ${STORE.timezone})`;

function linesCte({ from, to }: Range, channel: Channel = 'all') {
  const pos = Prisma.sql`
    SELECT 'pos'::text AS channel, s.id AS doc_id, s."createdAt" AS at,
           s."customerId" AS customer_id, si."productId" AS product_id, si.quantity AS units,
           COALESCE(si."lineTotal"::float8 * s.total / NULLIF(s.subtotal, 0), 0) AS revenue,
           (si."unitCost" * si.quantity)::float8 AS cost
    FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId"
    WHERE s."createdAt" >= ${ts(from)} AND s."createdAt" < ${ts(to)}`;
  const online = Prisma.sql`
    SELECT 'online'::text, o.id, o."createdAt", o."customerId", oi."productId", oi.quantity,
           oi."lineTotal"::float8, (oi."unitCost" * oi.quantity)::float8
    FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
    WHERE o.status <> 'CANCELLED' AND o."createdAt" >= ${ts(from)} AND o."createdAt" < ${ts(to)}`;
  const body =
    channel === 'pos'
      ? pos
      : channel === 'online'
        ? online
        : Prisma.sql`${pos} UNION ALL ${online}`;
  return Prisma.sql`WITH lines AS (${body})`;
}

const round = (n: number) => Math.round(n);

// ── KPIs and trends ─────────────────────────────────────────────────────────

export async function getKpis(range: Range, channel: Channel = 'all'): Promise<KpiSnapshot> {
  const [row] = await prisma.$queryRaw<
    { revenue: number; transactions: number; items: number; cost: number }[]
  >`${linesCte(range, channel)}
    SELECT COALESCE(SUM(revenue), 0)::float8 AS revenue,
           COUNT(DISTINCT doc_id)::int AS transactions,
           COALESCE(SUM(units), 0)::int AS items,
           COALESCE(SUM(cost), 0)::float8 AS cost
    FROM lines`;
  const revenue = row?.revenue ?? 0;
  const transactions = row?.transactions ?? 0;
  return {
    revenue: round(revenue),
    transactions,
    avgBasket: transactions ? round(revenue / transactions) : 0,
    itemsSold: row?.items ?? 0,
    grossMargin: revenue ? Number(((revenue - (row?.cost ?? 0)) / revenue).toFixed(4)) : 0,
  };
}

export type GroupBy = 'day' | 'week' | 'month';

export async function getRevenueSeries(range: Range, groupBy: GroupBy, channel: Channel = 'all') {
  const rows = await prisma.$queryRaw<
    { period: string; pos: number | null; online: number | null; transactions: number }[]
  >`${linesCte(range, channel)}
    SELECT to_char(date_trunc(${groupBy}, ${local('at')}), 'YYYY-MM-DD') AS period,
           SUM(revenue) FILTER (WHERE channel = 'pos')::float8 AS pos,
           SUM(revenue) FILTER (WHERE channel = 'online')::float8 AS online,
           COUNT(DISTINCT doc_id)::int AS transactions
    FROM lines GROUP BY 1 ORDER BY 1`;
  const series = rows.map((r) => ({
    period: r.period,
    pos: round(r.pos ?? 0),
    online: round(r.online ?? 0),
    total: round((r.pos ?? 0) + (r.online ?? 0)),
    transactions: r.transactions,
  }));
  if (groupBy !== 'day') return series;
  // Fill gaps so charts show quiet days as zero instead of skipping them.
  const byDay = new Map(series.map((s) => [s.period, s]));
  const start = localDate(range.from);
  const end = localDate(new Date(range.to.getTime() - 1));
  return eachDay(start, end).map(
    (d) => byDay.get(d) ?? { period: d, pos: 0, online: 0, total: 0, transactions: 0 },
  );
}

// ── Products and categories ─────────────────────────────────────────────────

export type RankBy = 'revenue' | 'units' | 'margin';

export async function getTopProducts(
  range: Range,
  opts: { limit: number; rankBy: RankBy; category?: string; channel?: Channel },
) {
  const order = Prisma.raw(opts.rankBy);
  const category = opts.category ?? null;
  const rows = await prisma.$queryRaw<
    {
      productId: string;
      name: string;
      category: string;
      units: number;
      revenue: number;
      margin: number;
    }[]
  >`${linesCte(range, opts.channel)}
    SELECT l.product_id AS "productId", p.name, c.name AS category,
           SUM(l.units)::int AS units, SUM(l.revenue)::float8 AS revenue,
           (SUM(l.revenue) - SUM(l.cost))::float8 AS margin
    FROM lines l
    JOIN "Product" p ON p.id = l.product_id
    JOIN "Category" c ON c.id = p."categoryId"
    WHERE ${category}::text IS NULL OR c.name ILIKE ${category} OR c.slug = ${category}
       OR c.department ILIKE ${category}
    GROUP BY 1, 2, 3
    ORDER BY ${order} DESC
    LIMIT ${opts.limit}`;
  return rows.map((r) => ({ ...r, revenue: round(r.revenue), margin: round(r.margin) }));
}

export async function getCategoryPerformance(range: Range) {
  const rows = await prisma.$queryRaw<
    { category: string; department: string; units: number; revenue: number; cost: number }[]
  >`${linesCte(range)}
    SELECT c.name AS category, c.department, SUM(l.units)::int AS units,
           SUM(l.revenue)::float8 AS revenue, SUM(l.cost)::float8 AS cost
    FROM lines l
    JOIN "Product" p ON p.id = l.product_id
    JOIN "Category" c ON c.id = p."categoryId"
    GROUP BY 1, 2 ORDER BY revenue DESC`;
  return rows.map((r) => ({
    category: r.category,
    department: r.department,
    units: r.units,
    revenue: round(r.revenue),
    marginPct: r.revenue ? Number(((r.revenue - r.cost) / r.revenue).toFixed(4)) : 0,
  }));
}

export async function getProductPerformance(productId: string, range: Range) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true, supplier: { select: { name: true, leadTimeDays: true } } },
  });
  if (!product) throw notFound('Product');
  const rows = await prisma.$queryRaw<{ day: string; units: number; revenue: number }[]>`
    ${linesCte(range)}
    SELECT to_char(${local('at')}, 'YYYY-MM-DD') AS day, SUM(units)::int AS units,
           SUM(revenue)::float8 AS revenue
    FROM lines WHERE product_id = ${productId}
    GROUP BY 1 ORDER BY 1`;
  const units = rows.reduce((s, r) => s + r.units, 0);
  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  return {
    product: {
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category.name,
      price: product.price,
      costPrice: product.costPrice,
      stock: product.stock,
      reorderPoint: product.reorderPoint,
      supplier: product.supplier,
    },
    totals: { units, revenue: round(revenue) },
    daily: rows.map((r) => ({ day: r.day, units: r.units, revenue: round(r.revenue) })),
  };
}

// ── Patterns ────────────────────────────────────────────────────────────────

/** Units sold per product per local day: the demand history used for forecasting. */
export async function getDailyUnitsByProduct(range: Range) {
  return prisma.$queryRaw<{ productId: string; day: string; units: number }[]>`
    ${linesCte(range)}
    SELECT product_id AS "productId", to_char(${local('at')}, 'YYYY-MM-DD') AS day,
           SUM(units)::int AS units
    FROM lines GROUP BY 1, 2`;
}

export async function getHourlyPattern(range: Range) {
  return prisma.$queryRaw<{ hour: number; revenue: number; transactions: number }[]>`
    ${linesCte(range)}
    SELECT EXTRACT(HOUR FROM ${local('at')})::int AS hour,
           ROUND(SUM(revenue))::float8 AS revenue, COUNT(DISTINCT doc_id)::int AS transactions
    FROM lines GROUP BY 1 ORDER BY 1`;
}

export async function getWeekdayPattern(range: Range) {
  return prisma.$queryRaw<{ weekday: string; revenue: number; transactions: number }[]>`
    ${linesCte(range)}
    SELECT to_char(${local('at')}, 'Dy') AS weekday,
           ROUND(SUM(revenue))::float8 AS revenue, COUNT(DISTINCT doc_id)::int AS transactions
    FROM lines
    GROUP BY 1, EXTRACT(ISODOW FROM ${local('at')})
    ORDER BY EXTRACT(ISODOW FROM ${local('at')})`;
}

export async function getPaymentMix({ from, to }: Range) {
  return prisma.$queryRaw<{ method: string; revenue: number; count: number }[]>`
    SELECT "paymentMethod"::text AS method, SUM(total)::float8 AS revenue, COUNT(*)::int AS count
    FROM "Sale" WHERE "createdAt" >= ${ts(from)} AND "createdAt" < ${ts(to)}
    GROUP BY 1
    UNION ALL
    SELECT CASE WHEN "paymentMethod" = 'COD' THEN 'ONLINE_COD' ELSE 'ONLINE_PREPAID' END,
           SUM(total)::float8, COUNT(*)::int
    FROM "Order"
    WHERE status <> 'CANCELLED' AND "createdAt" >= ${ts(from)} AND "createdAt" < ${ts(to)}
    GROUP BY 1
    ORDER BY revenue DESC`;
}

export async function getCashierPerformance({ from, to }: Range) {
  return prisma.$queryRaw<
    { cashier: string; transactions: number; revenue: number; avgBasket: number }[]
  >`
    SELECT u.name AS cashier, COUNT(*)::int AS transactions, SUM(s.total)::float8 AS revenue,
           ROUND(AVG(s.total))::float8 AS "avgBasket"
    FROM "Sale" s JOIN "User" u ON u.id = s."cashierId"
    WHERE s."createdAt" >= ${ts(from)} AND s."createdAt" < ${ts(to)}
    GROUP BY u.name ORDER BY revenue DESC`;
}

// ── Customers ───────────────────────────────────────────────────────────────

export type CustomerSegment = 'top_spenders' | 'lapsed' | 'new' | 'loyalty_leaders';

export async function getCustomerInsights(segment: CustomerSegment, limit: number, range: Range) {
  switch (segment) {
    case 'top_spenders':
      return prisma.$queryRaw<
        { id: string; name: string; phone: string | null; revenue: number; visits: number }[]
      >`${linesCte(range)}
        SELECT c.id, c.name, c.phone, ROUND(SUM(l.revenue))::float8 AS revenue,
               COUNT(DISTINCT l.doc_id)::int AS visits
        FROM lines l JOIN "Customer" c ON c.id = l.customer_id
        GROUP BY c.id ORDER BY revenue DESC LIMIT ${limit}`;
    case 'lapsed': {
      // Regulars (3+ visits) who have not been back for 30 days.
      const cutoff = new Date(Date.now() - 30 * 86_400_000);
      const rows = await prisma.customer.findMany({
        where: { visitCount: { gte: 3 }, lastVisitAt: { lt: cutoff } },
        orderBy: { totalSpent: 'desc' },
        take: limit,
      });
      return rows.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        lifetimeSpend: c.totalSpent,
        visits: c.visitCount,
        lastVisit: c.lastVisitAt ? localDate(c.lastVisitAt) : null,
        daysSinceVisit: c.lastVisitAt
          ? Math.floor((Date.now() - c.lastVisitAt.getTime()) / 86_400_000)
          : null,
      }));
    }
    case 'new': {
      const rows = await prisma.customer.findMany({
        where: { createdAt: { gte: range.from, lt: range.to } },
        orderBy: { totalSpent: 'desc' },
        take: limit,
      });
      return rows.map((c) => ({
        id: c.id,
        name: c.name,
        joined: localDate(c.createdAt),
        lifetimeSpend: c.totalSpent,
        visits: c.visitCount,
      }));
    }
    case 'loyalty_leaders': {
      const rows = await prisma.customer.findMany({
        orderBy: { loyaltyPoints: 'desc' },
        take: limit,
      });
      return rows.map((c) => ({
        id: c.id,
        name: c.name,
        points: c.loyaltyPoints,
        lifetimeSpend: c.totalSpent,
        visits: c.visitCount,
      }));
    }
  }
}

// ── Inventory ───────────────────────────────────────────────────────────────

export type InventoryView =
  'low_stock' | 'out_of_stock' | 'expiring_soon' | 'dead_stock' | 'overstock';

export async function getInventoryView(view: InventoryView, limit: number) {
  const now = new Date();
  const last28 = { from: new Date(now.getTime() - 28 * 86_400_000), to: now };
  switch (view) {
    case 'low_stock':
    case 'out_of_stock':
      return prisma.$queryRaw<
        { id: string; name: string; stock: number; reorderPoint: number; supplier: string | null }[]
      >`
        SELECT p.id, p.name, p.stock, p."reorderPoint", s.name AS supplier
        FROM "Product" p LEFT JOIN "Supplier" s ON s.id = p."supplierId"
        WHERE p."isActive" AND ${
          view === 'out_of_stock'
            ? Prisma.sql`p.stock <= 0`
            : Prisma.sql`p.stock > 0 AND p.stock <= p."reorderPoint"`
        }
        ORDER BY p.stock ASC, p.name LIMIT ${limit}`;
    case 'expiring_soon':
      return prisma.$queryRaw<
        { id: string; name: string; stock: number; expiryDate: string; stockValue: number }[]
      >`
        SELECT id, name, stock, to_char("expiryDate", 'YYYY-MM-DD') AS "expiryDate",
               (stock * "costPrice")::float8 AS "stockValue"
        FROM "Product"
        WHERE "isActive" AND stock > 0 AND "expiryDate" IS NOT NULL
          AND "expiryDate" <= ${ts(new Date(now.getTime() + 30 * 86_400_000))}
        ORDER BY "expiryDate" ASC LIMIT ${limit}`;
    case 'dead_stock':
      return prisma.$queryRaw<{ id: string; name: string; stock: number; stockValue: number }[]>`
        ${linesCte({ from: new Date(now.getTime() - 30 * 86_400_000), to: now })}
        SELECT p.id, p.name, p.stock, (p.stock * p."costPrice")::float8 AS "stockValue"
        FROM "Product" p
        WHERE p."isActive" AND p.stock > 0
          AND NOT EXISTS (SELECT 1 FROM lines l WHERE l.product_id = p.id)
        ORDER BY "stockValue" DESC LIMIT ${limit}`;
    case 'overstock':
      return prisma.$queryRaw<
        { id: string; name: string; stock: number; dailySales: number; daysOfCover: number }[]
      >`
        ${linesCte(last28)}
        , velocity AS (SELECT product_id, SUM(units)::float8 / 28 AS daily FROM lines GROUP BY 1)
        SELECT p.id, p.name, p.stock, ROUND(v.daily::numeric, 2)::float8 AS "dailySales",
               ROUND((p.stock / v.daily)::numeric)::float8 AS "daysOfCover"
        FROM "Product" p JOIN velocity v ON v.product_id = p.id
        WHERE p."isActive" AND v.daily > 0 AND p.stock / v.daily > 60
        ORDER BY "daysOfCover" DESC LIMIT ${limit}`;
  }
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export async function getDashboard(): Promise<DashboardDTO> {
  const today = localDate();
  const todayRange = localDayRange(today, today);
  const yesterday = addDays(today, -1);
  const last30 = localDayRange(addDays(today, -29), today);

  const [
    todayKpis,
    yesterdayKpis,
    last30Kpis,
    series,
    hourly,
    topProducts,
    categories,
    paymentMix,
    lowStock,
    lowStockCount,
    expiringCount,
    pendingOrders,
    recentSales,
  ] = await Promise.all([
    getKpis(todayRange),
    getKpis(localDayRange(yesterday, yesterday)),
    getKpis(last30),
    getRevenueSeries(last30, 'day'),
    getHourlyPattern(last30),
    getTopProducts(last30, { limit: 6, rankBy: 'revenue' }),
    getCategoryPerformance(last30),
    getPaymentMix(last30),
    prisma.product.findMany({
      where: { isActive: true, stock: { lte: prisma.product.fields.reorderPoint } },
      orderBy: { stock: 'asc' },
      select: { id: true, name: true, stock: true, reorderPoint: true },
      take: 6,
    }),
    prisma.product.count({
      where: { isActive: true, stock: { lte: prisma.product.fields.reorderPoint } },
    }),
    prisma.product.count({
      where: {
        isActive: true,
        stock: { gt: 0 },
        expiryDate: { not: null, lte: new Date(Date.now() + 30 * 86_400_000) },
      },
    }),
    prisma.order.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'PACKED'] } } }),
    prisma.sale.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: saleSummaryInclude }),
  ]);

  return {
    today: todayKpis,
    yesterday: yesterdayKpis,
    last30: last30Kpis,
    revenueSeries: series.map((s) => ({ date: s.period, pos: s.pos, online: s.online })),
    hourly,
    topProducts: topProducts.map((p) => ({
      productId: p.productId,
      name: p.name,
      units: p.units,
      revenue: p.revenue,
    })),
    categoryMix: categories.map((c) => ({ category: c.category, revenue: c.revenue })),
    paymentMix: paymentMix.map((p) => ({
      method: p.method,
      revenue: round(p.revenue),
      count: p.count,
    })),
    lowStock,
    lowStockCount,
    expiringCount,
    pendingOrders,
    recentSales: recentSales.map(toSaleSummaryDTO),
  };
}
