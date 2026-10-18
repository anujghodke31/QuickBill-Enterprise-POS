// Demand forecasting for reorder planning. Deliberately classical and explainable:
// weekday seasonality + Holt's linear exponential smoothing + safety stock from
// forecast error. The LLM never does this arithmetic; it only narrates the result.

export interface ForecastOptions {
  /** Days to forecast ahead. */
  horizon: number;
  /** z-score for the target cycle service level (1.645 ≈ 95%). */
  serviceZ: number;
  /** Days between reorder reviews; an order should cover lead time + this. */
  reviewDays: number;
  alpha: number;
  beta: number;
}

export const DEFAULT_OPTIONS: ForecastOptions = {
  horizon: 14,
  serviceZ: 1.645,
  reviewDays: 7,
  alpha: 0.3,
  beta: 0.1,
};

export interface ProductForecast {
  forecast: number[];
  forecastDailyDemand: number;
  avgDailyDemand: number;
  demandStdDev: number;
  trend: number;
  safetyStock: number;
  reorderPoint: number;
  suggestedQty: number;
  daysOfCover: number | null;
  risk: 'critical' | 'warning' | 'ok';
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/**
 * Multiplicative day-of-week indices (index 0 = the weekday of `values[0]`'s
 * offset class). Indices are shrunk toward 1 when a weekday has few samples and
 * normalised to average exactly 1.
 */
export function weekdayIndices(values: number[], firstWeekday: number): number[] {
  const overall = mean(values);
  if (overall === 0) return Array(7).fill(1);
  const buckets: number[][] = Array.from({ length: 7 }, () => []);
  values.forEach((v, i) => buckets[(firstWeekday + i) % 7]!.push(v));
  const raw = buckets.map((b) => {
    if (b.length === 0) return 1;
    const idx = mean(b) / overall;
    return 1 + (idx - 1) * Math.min(1, b.length / 4);
  });
  const norm = mean(raw);
  return raw.map((r) => r / norm);
}

/** Holt's linear trend method. Returns h-step forecasts and the one-step-ahead error RMS. */
export function holt(values: number[], horizon: number, alpha: number, beta: number) {
  if (values.length === 0) return { forecast: Array(horizon).fill(0), rmse: 0 };
  const warmup = Math.min(7, values.length);
  let level = mean(values.slice(0, warmup));
  let trend = 0;
  const errors: number[] = [];
  values.forEach((y, t) => {
    const predicted = level + trend;
    if (t >= warmup) errors.push(y - predicted);
    const nextLevel = alpha * y + (1 - alpha) * (level + trend);
    trend = beta * (nextLevel - level) + (1 - beta) * trend;
    level = nextLevel;
  });
  const forecast = Array.from({ length: horizon }, (_, h) => Math.max(0, level + (h + 1) * trend));
  const rmse = errors.length ? Math.sqrt(mean(errors.map((e) => e * e))) : Math.sqrt(mean(values));
  return { forecast, rmse };
}

/** Demand over the next `days`, using the forecast and its mean beyond the horizon. */
function demandOver(forecast: number[], days: number): number {
  const whole = Math.floor(days);
  const tailRate = mean(forecast.slice(-7));
  let total = sum(forecast.slice(0, whole)) + Math.max(0, whole - forecast.length) * tailRate;
  const fraction = days - whole;
  if (fraction > 0) total += (forecast[whole] ?? tailRate) * fraction;
  return total;
}

/** Days until stock runs out at forecast demand, or null if it lasts beyond 120 days. */
export function daysOfCover(stock: number, forecast: number[]): number | null {
  if (stock <= 0) return 0;
  const tailRate = mean(forecast.slice(-7));
  let remaining = stock;
  for (let day = 0; day < 120; day++) {
    const demand = forecast[day] ?? tailRate;
    if (demand >= remaining) return Number((day + remaining / Math.max(demand, 1e-9)).toFixed(1));
    remaining -= demand;
  }
  return null;
}

/**
 * @param history daily units sold, oldest first, ending yesterday
 * @param firstWeekday weekday (0=Sun) of history[0]
 * @param onOrder units already ordered from the supplier but not yet received
 */
export function forecastProduct(
  history: number[],
  firstWeekday: number,
  stock: number,
  leadTimeDays: number,
  options: ForecastOptions = DEFAULT_OPTIONS,
  onOrder = 0,
): ProductForecast {
  const indices = weekdayIndices(history, firstWeekday);
  const weekdayOf = (i: number) => (firstWeekday + i) % 7;
  const deseasonalised = history.map((v, i) => v / indices[weekdayOf(i)]!);

  // Intermittent sellers (mostly zero days) get no trend term: a single busy day
  // should not be extrapolated into a ramp.
  const zeroShare = history.filter((v) => v === 0).length / Math.max(1, history.length);
  const beta = zeroShare > 0.5 ? 0 : options.beta;
  const { forecast: base, rmse } = holt(deseasonalised, options.horizon, options.alpha, beta);
  const forecast = base.map((v, h) =>
    Number((v * indices[weekdayOf(history.length + h)]!).toFixed(2)),
  );

  const last7 = sum(history.slice(-7));
  const prev7 = sum(history.slice(-14, -7));
  const trend = prev7 > 0 ? (last7 - prev7) / prev7 : last7 > 0 ? 1 : 0;

  const leadDemand = demandOver(forecast, leadTimeDays);
  const safetyStock = Math.ceil(options.serviceZ * rmse * Math.sqrt(leadTimeDays));
  const reorderPoint = Math.ceil(leadDemand + safetyStock);
  const coverDemand = demandOver(forecast, leadTimeDays + options.reviewDays);
  const forecastDailyDemand = mean(forecast.slice(0, 7));
  // Plan on inventory position (on hand + on order) so open purchase orders are not double-counted.
  const position = stock + onOrder;
  const suggestedQty =
    forecastDailyDemand > 0.05 ? Math.max(0, Math.ceil(coverDemand + safetyStock - position)) : 0;

  let risk: ProductForecast['risk'] = 'ok';
  if (forecastDailyDemand > 0.05) {
    if (stock <= 0 || position <= leadDemand) risk = 'critical';
    else if (position <= reorderPoint) risk = 'warning';
  }

  return {
    forecast,
    forecastDailyDemand: Number(forecastDailyDemand.toFixed(2)),
    avgDailyDemand: Number(mean(history.slice(-28)).toFixed(2)),
    demandStdDev: Number(rmse.toFixed(2)),
    trend: Number(trend.toFixed(3)),
    safetyStock,
    reorderPoint,
    suggestedQty,
    daysOfCover: forecastDailyDemand > 0.05 ? daysOfCover(stock, forecast) : null,
    risk,
  };
}
