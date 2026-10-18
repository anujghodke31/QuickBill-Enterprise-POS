import { describe, expect, it } from 'vitest';
import { change, formatRupees, label } from './format';

describe('format helpers', () => {
  it('rounds to whole rupees with Indian digit grouping', () => {
    expect(formatRupees(12_345_678)).toBe('₹1,23,457');
  });

  it('gives enums a readable label', () => {
    expect(label('ONLINE_PREPAID')).toBe('Online, prepaid');
    expect(label('CASH')).toBe('Cash');
    expect(label('SOMETHING_NEW')).toBe('Something new');
  });

  it('computes relative change only when there is a baseline', () => {
    expect(change(120, 100)).toBeCloseTo(0.2);
    expect(change(5, 0)).toBeNull();
  });
});
