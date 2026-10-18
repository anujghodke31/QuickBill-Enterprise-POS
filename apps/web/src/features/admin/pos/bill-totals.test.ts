import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CustomerDTO, ProductDTO } from '@quickbill/shared';
import { useBillTotals } from './bill-panel';
import { usePos } from './pos-store';

const product = (id: string, price: number, taxRate: number, stock = 10): ProductDTO => ({
  id,
  sku: id,
  barcode: null,
  name: id,
  slug: id,
  description: '',
  brand: null,
  unit: '1 pc',
  category: { id: 'c', name: 'Dairy & Eggs', slug: 'dairy' },
  supplier: null,
  price,
  costPrice: 0,
  compareAtPrice: null,
  taxRate,
  stock,
  reorderPoint: 2,
  imageUrl: null,
  tags: [],
  isPublished: true,
  expiryDate: null,
  ratingAvg: 0,
  ratingCount: 0,
  createdAt: '',
  updatedAt: '',
});

const customer: CustomerDTO = {
  id: 'cust',
  name: 'Riya',
  phone: '9876500001',
  email: null,
  loyaltyPoints: 500,
  totalSpent: 0,
  visitCount: 0,
  lastVisitAt: null,
  createdAt: '',
};

describe('POS bill totals', () => {
  beforeEach(() => usePos.getState().reset());

  it('adds GST-inclusive lines and reports the tax they contain', () => {
    act(() => {
      usePos.getState().addProduct(product('butter', 11_800, 18), 'Fresh');
      usePos.getState().addProduct(product('butter', 11_800, 18), 'Fresh');
      usePos.getState().addProduct(product('milk', 2_800, 0), 'Fresh');
    });
    const { result } = renderHook(() => useBillTotals());
    expect(result.current.items).toBe(3);
    expect(result.current.total).toBe(26_400);
    expect(result.current.taxTotal).toBe(3_600);
  });

  it('caps loyalty redemption at half the bill', () => {
    act(() => {
      usePos.getState().addProduct(product('ghee', 64_000, 5), 'Food & Groceries');
      usePos.getState().setCustomer(customer);
      usePos.getState().setRedeemPoints(10_000);
    });
    const { result } = renderHook(() => useBillTotals());
    expect(result.current.maxRedeem).toBe(320);
    expect(result.current.redeem).toBe(320);
    expect(result.current.total).toBe(32_000);
  });

  it('limits redemption to the points the customer has', () => {
    act(() => {
      usePos.getState().addProduct(product('rice', 300_000, 5), 'Food & Groceries');
      usePos.getState().setCustomer(customer);
      usePos.getState().setRedeemPoints(10_000);
    });
    const { result } = renderHook(() => useBillTotals());
    expect(result.current.redeem).toBe(500);
    expect(result.current.discount).toBe(50_000);
  });

  it('starts a fresh idempotency key for every bill', () => {
    const first = usePos.getState().idempotencyKey;
    act(() => usePos.getState().reset());
    expect(usePos.getState().idempotencyKey).not.toBe(first);
  });
});
