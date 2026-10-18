import { describe, expect, it } from 'vitest';
import { daysOfCover, forecastProduct, holt, weekdayIndices } from './model';

describe('weekdayIndices', () => {
  it('detects a weekend peak and normalises to an average of 1', () => {
    // 4 weeks starting on a Monday (weekday 1); Sat/Sun sell double.
    const week = [10, 10, 10, 10, 10, 20, 20];
    const values = [...week, ...week, ...week, ...week];
    const idx = weekdayIndices(values, 1);
    expect(idx.reduce((a, b) => a + b, 0) / 7).toBeCloseTo(1, 6);
    expect(idx[6]! / idx[1]!).toBeCloseTo(2, 1); // Saturday vs Monday
    expect(idx[0]! / idx[1]!).toBeCloseTo(2, 1); // Sunday vs Monday
  });

  it('returns flat indices when nothing sold', () => {
    expect(weekdayIndices(Array(28).fill(0), 0)).toEqual(Array(7).fill(1));
  });
});

describe('holt', () => {
  it('follows a linear upward trend', () => {
    const values = Array.from({ length: 30 }, (_, i) => 10 + i);
    const { forecast } = holt(values, 3, 0.5, 0.3);
    expect(forecast[0]).toBeGreaterThan(36);
    expect(forecast[2]!).toBeGreaterThan(forecast[0]!);
  });

  it('never forecasts negative demand', () => {
    const values = Array.from({ length: 30 }, (_, i) => Math.max(0, 30 - i * 2));
    const { forecast } = holt(values, 14, 0.5, 0.3);
    expect(Math.min(...forecast)).toBeGreaterThanOrEqual(0);
  });
});

describe('daysOfCover', () => {
  it('counts fractional days until stock runs out', () => {
    expect(daysOfCover(25, Array(14).fill(10))).toBe(2.5);
    expect(daysOfCover(0, Array(14).fill(10))).toBe(0);
  });

  it('returns null when stock outlasts the simulation window', () => {
    expect(daysOfCover(10_000, Array(14).fill(1))).toBeNull();
  });
});

describe('forecastProduct', () => {
  const steady = Array(56).fill(10);

  it('flags a product as critical when stock will not last the lead time', () => {
    const f = forecastProduct(steady, 0, 15, 3);
    expect(f.forecastDailyDemand).toBeCloseTo(10, 0);
    expect(f.risk).toBe('critical');
    // Needs to cover 3 days lead time + 7 days review = ~100 units, minus 15 on hand.
    expect(f.suggestedQty).toBeGreaterThanOrEqual(85);
  });

  it('counts stock already on order before suggesting more', () => {
    const without = forecastProduct(steady, 0, 20, 3);
    const withOpenPo = forecastProduct(steady, 0, 20, 3, undefined, 60);
    expect(without.risk).toBe('critical');
    expect(withOpenPo.risk).toBe('ok');
    expect(withOpenPo.suggestedQty).toBe(without.suggestedQty - 60);
  });

  it('keeps an empty shelf critical even when a delivery is on the way', () => {
    expect(forecastProduct(steady, 0, 0, 3, undefined, 200).risk).toBe('critical');
  });

  it('marks a well-stocked product as ok and suggests nothing', () => {
    const f = forecastProduct(steady, 0, 500, 3);
    expect(f.risk).toBe('ok');
    expect(f.suggestedQty).toBe(0);
    expect(f.daysOfCover).toBeGreaterThan(40);
  });

  it('adds safety stock for volatile demand', () => {
    const volatile = Array.from({ length: 56 }, (_, i) => (i % 2 === 0 ? 2 : 18));
    const calm = forecastProduct(steady, 0, 100, 5);
    const noisy = forecastProduct(volatile, 0, 100, 5);
    expect(noisy.safetyStock).toBeGreaterThan(calm.safetyStock);
  });

  it('ignores products with no demand', () => {
    const f = forecastProduct(Array(56).fill(0), 0, 3, 3);
    expect(f.risk).toBe('ok');
    expect(f.suggestedQty).toBe(0);
    expect(f.daysOfCover).toBeNull();
  });

  it('reports week-over-week trend', () => {
    const rising = [...Array(49).fill(10), ...Array(7).fill(15)];
    expect(forecastProduct(rising, 0, 100, 3).trend).toBeCloseTo(0.5, 2);
  });
});
