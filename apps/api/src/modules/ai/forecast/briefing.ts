import type { CopilotEvent } from '@quickbill/shared';
import { localDate } from '../../../lib/dates';
import { fallbackParams, getClaude, MODEL } from '../claude';
import { buildForecast } from './forecast.service';

const SYSTEM = `You are the purchasing assistant for QuickBill Mart, an Indian neighbourhood grocery store.
You receive the output of a statistical demand forecast and write a short purchasing briefing for the store manager.

Rules:
- Use only the numbers provided. Never recompute, round differently or invent figures.
- Money is given in paise; present it in rupees with the ₹ symbol and Indian digit grouping (₹1,23,456).
- Lead with a one-sentence headline, then a "Order today" section grouped by supplier, then "Watch list" for warning items, then at most two observations about trends.
- For each item say why in a few words (e.g. "2.1 days of cover, supplier needs 3 days").
- Keep it under 250 words. Use Markdown headings and bullet lists. No tables.`;

/** Streams a plain-English briefing of the current reorder forecast. */
export async function streamForecastBriefing(
  send: (event: CopilotEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const forecast = await buildForecast();
  const atRisk = forecast.rows
    .filter((r) => r.risk !== 'ok')
    .slice(0, 25)
    .map((r) => ({
      product: r.name,
      risk: r.risk,
      supplier: r.supplier?.name ?? 'No supplier assigned',
      leadTimeDays: r.leadTimeDays,
      stock: r.stock,
      alreadyOnOrder: r.onOrder,
      forecastUnitsPerDay: r.forecastDailyDemand,
      daysOfCover: r.daysOfCover,
      expectedStockoutDate: r.stockoutDate,
      weekOverWeekTrend: `${Math.round(r.trend * 100)}%`,
      suggestedOrderQty: r.suggestedQty,
      orderValuePaise: r.suggestedQty * r.unitCost,
    }));

  const payload = {
    today: localDate(),
    serviceLevel: forecast.serviceLevel,
    criticalCount: forecast.totals.critical,
    warningCount: forecast.totals.warning,
    totalSuggestedOrderValuePaise: forecast.totals.reorderValue,
    items: atRisk,
  };

  const stream = getClaude().beta.messages.stream(
    {
      model: MODEL,
      max_tokens: 16000,
      ...fallbackParams(),
      output_config: { effort: 'low' },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Here is today's forecast output as JSON:\n\n${JSON.stringify(payload, null, 1)}\n\nWrite the purchasing briefing.`,
        },
      ],
    },
    { signal },
  );
  stream.on('text', (delta) => send({ type: 'text', delta }));
  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') {
    send({ type: 'error', message: 'The AI declined to write this briefing.' });
  }
  send({ type: 'done' });
}
