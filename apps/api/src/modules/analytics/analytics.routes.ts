import { Router } from 'express';
import { z } from 'zod';
import { addDays, localDate, localDayRange } from '../../lib/dates';
import { authenticate, MANAGEMENT, requireRole } from '../../middleware/auth';
import * as analytics from './analytics.service';

export const analyticsRouter = Router();
analyticsRouter.use(authenticate, requireRole(...MANAGEMENT));

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const rangeQuery = z.object({
  start: isoDate.optional(),
  end: isoDate.optional(),
});

function resolveRange(query: unknown) {
  const { start, end } = rangeQuery.parse(query);
  const endDay = end ?? localDate();
  const startDay = start ?? addDays(endDay, -29);
  return localDayRange(startDay, endDay);
}

analyticsRouter.get('/dashboard', async (_req, res) => {
  res.json(await analytics.getDashboard());
});

analyticsRouter.get('/report', async (req, res) => {
  const range = resolveRange(req.query);
  const { groupBy } = z
    .object({ groupBy: z.enum(['day', 'week', 'month']).default('day') })
    .parse(req.query);
  const [kpis, series, categories, topProducts, weekdays, cashiers, payments] = await Promise.all([
    analytics.getKpis(range),
    analytics.getRevenueSeries(range, groupBy),
    analytics.getCategoryPerformance(range),
    analytics.getTopProducts(range, { limit: 15, rankBy: 'revenue' }),
    analytics.getWeekdayPattern(range),
    analytics.getCashierPerformance(range),
    analytics.getPaymentMix(range),
  ]);
  res.json({ kpis, series, categories, topProducts, weekdays, cashiers, payments });
});
