import type { ForecastRowDTO, ForecastSummaryDTO, PurchaseOrderDTO } from '@quickbill/shared';
import { addDays, eachDay, localDate, localDayRange } from '../../../lib/dates';
import { prisma } from '../../../lib/prisma';
import { getDailyUnitsByProduct } from '../../analytics/analytics.service';
import {
  createPurchaseOrderTx,
  poInclude,
  toPurchaseOrderDTO,
} from '../../purchasing/purchase-orders.service';
import { DEFAULT_OPTIONS, forecastProduct } from './model';

const HISTORY_DAYS = 56;
const DEFAULT_LEAD_TIME = 3;
const RISK_ORDER = { critical: 0, warning: 1, ok: 2 } as const;
const CACHE_MS = 5 * 60 * 1000;

let cache: { at: number; value: ForecastSummaryDTO } | null = null;

export function invalidateForecast() {
  cache = null;
}

export async function buildForecast(): Promise<ForecastSummaryDTO> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;

  // History ends yesterday: today is still in progress and would bias the forecast down.
  const today = localDate();
  const end = addDays(today, -1);
  const start = addDays(end, -(HISTORY_DAYS - 1));
  const days = eachDay(start, end);
  const firstWeekday = new Date(`${start}T00:00:00Z`).getUTCDay();

  const [unitRows, products, openOrders] = await Promise.all([
    getDailyUnitsByProduct(localDayRange(start, end)),
    prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: { select: { name: true } },
        supplier: { select: { id: true, name: true, leadTimeDays: true } },
      },
    }),
    prisma.purchaseOrderItem.groupBy({
      by: ['productId'],
      where: { purchaseOrder: { status: 'ORDERED' } },
      _sum: { quantity: true },
    }),
  ]);
  const units = new Map(unitRows.map((r) => [`${r.productId}|${r.day}`, r.units]));
  const onOrderByProduct = new Map(openOrders.map((o) => [o.productId, o._sum.quantity ?? 0]));

  const rows: ForecastRowDTO[] = [];
  for (const p of products) {
    const history = days.map((d) => units.get(`${p.id}|${d}`) ?? 0);
    const sold = history.some((u) => u > 0);
    if (!sold && p.stock > p.reorderPoint) continue;

    const leadTimeDays = p.supplier?.leadTimeDays ?? DEFAULT_LEAD_TIME;
    const onOrder = onOrderByProduct.get(p.id) ?? 0;
    // Suppliers who deliver next-day (fresh produce, dairy) are reordered daily, others weekly.
    const options = {
      ...DEFAULT_OPTIONS,
      reviewDays: leadTimeDays <= 1 ? 1 : DEFAULT_OPTIONS.reviewDays,
    };
    const f = forecastProduct(history, firstWeekday, p.stock, leadTimeDays, options, onOrder);
    rows.push({
      productId: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category.name,
      supplier: p.supplier,
      stock: p.stock,
      onOrder,
      unitCost: p.costPrice,
      avgDailyDemand: f.avgDailyDemand,
      forecastDailyDemand: f.forecastDailyDemand,
      demandStdDev: f.demandStdDev,
      trend: f.trend,
      leadTimeDays,
      safetyStock: f.safetyStock,
      reorderPoint: f.reorderPoint,
      daysOfCover: f.daysOfCover,
      stockoutDate: f.daysOfCover === null ? null : addDays(today, Math.floor(f.daysOfCover)),
      suggestedQty: f.suggestedQty,
      risk: f.risk,
      history: history.slice(-28),
      forecast: f.forecast,
    });
  }

  rows.sort(
    (a, b) =>
      RISK_ORDER[a.risk] - RISK_ORDER[b.risk] ||
      (a.daysOfCover ?? Infinity) - (b.daysOfCover ?? Infinity) ||
      b.forecastDailyDemand - a.forecastDailyDemand,
  );

  const atRisk = rows.filter((r) => r.risk !== 'ok');
  const value: ForecastSummaryDTO = {
    generatedAt: new Date().toISOString(),
    horizonDays: DEFAULT_OPTIONS.horizon,
    serviceLevel: 0.95,
    rows,
    totals: {
      critical: rows.filter((r) => r.risk === 'critical').length,
      warning: rows.filter((r) => r.risk === 'warning').length,
      reorderValue: atRisk.reduce((sum, r) => sum + r.suggestedQty * r.unitCost, 0),
    },
  };
  cache = { at: Date.now(), value };
  return value;
}

/**
 * Turns forecast suggestions into draft purchase orders, one per supplier.
 * Drafts still need a manager to review and place them.
 */
export async function draftPurchaseOrders(productIds: string[] | undefined, userId: string) {
  const forecast = await buildForecast();
  const wanted = new Set(productIds ?? []);
  const selected = forecast.rows.filter(
    (r) => r.suggestedQty > 0 && (productIds ? wanted.has(r.productId) : r.risk !== 'ok'),
  );

  const skipped = selected
    .filter((r) => !r.supplier)
    .map((r) => ({ productId: r.productId, name: r.name, reason: 'No supplier assigned' }));
  const bySupplier = new Map<string, ForecastRowDTO[]>();
  for (const row of selected) {
    if (!row.supplier) continue;
    bySupplier.set(row.supplier.id, [...(bySupplier.get(row.supplier.id) ?? []), row]);
  }

  const products = await prisma.product.findMany({
    where: { id: { in: selected.map((r) => r.productId) } },
    select: { id: true, taxRate: true },
  });
  const taxRates = new Map(products.map((p) => [p.id, p.taxRate]));

  const created: PurchaseOrderDTO[] = await prisma.$transaction(async (tx) => {
    const result: PurchaseOrderDTO[] = [];
    for (const [supplierId, rows] of bySupplier) {
      const po = await createPurchaseOrderTx(
        tx,
        {
          supplierId,
          items: rows.map((r) => ({
            productId: r.productId,
            quantity: r.suggestedQty,
            unitCost: r.unitCost,
            taxRate: taxRates.get(r.productId) ?? 0,
          })),
          notes: `Drafted from the demand forecast on ${localDate()}`,
        },
        userId,
        'FORECAST',
      );
      result.push(
        toPurchaseOrderDTO(
          await tx.purchaseOrder.findUniqueOrThrow({ where: { id: po.id }, include: poInclude }),
        ),
      );
    }
    return result;
  });

  return { created, skipped };
}
