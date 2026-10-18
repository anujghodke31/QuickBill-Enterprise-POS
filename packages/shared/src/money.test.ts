import { describe, expect, it } from 'vitest';
import { computeBillTotals, formatINR, gstComponent, rupeesToPaise } from './money';

describe('money helpers', () => {
  it('converts rupees to integer paise without float drift', () => {
    expect(rupeesToPaise(19.99)).toBe(1999);
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
  });

  it('extracts GST from a tax-inclusive amount', () => {
    expect(gstComponent(11_800, 18)).toBe(1_800);
    expect(gstComponent(10_500, 5)).toBe(500);
    expect(gstComponent(10_000, 0)).toBe(0);
  });

  it('formats paise as Indian rupees', () => {
    expect(formatINR(12_345_600)).toBe('₹1,23,456.00');
  });

  it('computes bill totals and spreads discounts across lines', () => {
    const totals = computeBillTotals(
      [
        { unitPrice: 11_800, quantity: 2, taxRate: 18 },
        { unitPrice: 10_500, quantity: 1, taxRate: 5 },
      ],
      3_410,
    );
    expect(totals.subtotal).toBe(34_100);
    expect(totals.discount).toBe(3_410);
    expect(totals.total).toBe(30_690);
    // 90% of each line remains: 3,240 GST on the 18% line + 450 on the 5% line
    expect(totals.taxTotal).toBe(3_690);
  });

  it('never discounts below zero', () => {
    const totals = computeBillTotals([{ unitPrice: 1_000, quantity: 1, taxRate: 0 }], 5_000);
    expect(totals.total).toBe(0);
    expect(totals.discount).toBe(1_000);
  });
});
