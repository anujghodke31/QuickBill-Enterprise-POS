// All money in QuickBill is stored and computed as integer paise (₹1 = 100 paise)
// so that totals never suffer from floating-point drift.

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrCompactFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatINR(paise: number, opts: { compact?: boolean } = {}): string {
  return (opts.compact ? inrCompactFormatter : inrFormatter).format(paise / 100);
}

/**
 * GST contained in a tax-inclusive amount.
 * e.g. ₹118 at 18% contains ₹18 of GST.
 */
export function gstComponent(inclusivePaise: number, ratePercent: number): number {
  if (ratePercent <= 0) return 0;
  return Math.round((inclusivePaise * ratePercent) / (100 + ratePercent));
}

export interface PricedLine {
  unitPrice: number;
  quantity: number;
  taxRate: number;
}

export interface BillTotals {
  subtotal: number;
  discount: number;
  taxTotal: number;
  total: number;
}

/**
 * Computes bill totals for GST-inclusive line items. A bill-level discount is
 * spread across lines proportionally so the GST figure stays accurate.
 */
export function computeBillTotals(lines: PricedLine[], discount = 0): BillTotals {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const safeDiscount = Math.min(Math.max(0, Math.round(discount)), subtotal);
  const ratio = subtotal === 0 ? 0 : (subtotal - safeDiscount) / subtotal;
  const taxTotal = lines.reduce(
    (sum, l) => sum + gstComponent(Math.round(l.unitPrice * l.quantity * ratio), l.taxRate),
    0,
  );
  return { subtotal, discount: safeDiscount, taxTotal, total: subtotal - safeDiscount };
}
