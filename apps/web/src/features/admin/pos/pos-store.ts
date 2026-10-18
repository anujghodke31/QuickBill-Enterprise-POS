import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CustomerDTO, PaymentMethod, ProductDTO } from '@quickbill/shared';

export interface BillLine {
  productId: string;
  name: string;
  brand: string | null;
  unit: string;
  category: string;
  department: string;
  unitPrice: number;
  taxRate: number;
  quantity: number;
  /** Stock when the item was rung up, to warn before over-selling. */
  available: number;
}

interface PosState {
  lines: BillLine[];
  customer: CustomerDTO | null;
  paymentMethod: PaymentMethod;
  /** Cash received in paise, or null until entered. */
  tendered: number | null;
  redeemPoints: number;
  /** Stable per bill so a retried checkout cannot create a duplicate sale. */
  idempotencyKey: string;
  addProduct: (product: ProductDTO, department: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeLine: (productId: string) => void;
  setCustomer: (customer: CustomerDTO | null) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setTendered: (paise: number | null) => void;
  setRedeemPoints: (points: number) => void;
  reset: () => void;
}

const fresh = () => ({
  lines: [] as BillLine[],
  customer: null,
  paymentMethod: 'UPI' as PaymentMethod,
  tendered: null,
  redeemPoints: 0,
  idempotencyKey: crypto.randomUUID(),
});

export const usePos = create<PosState>()(
  persist(
    (set) => ({
      ...fresh(),
      addProduct: (product, department) =>
        set((state) => {
          const existing = state.lines.find((l) => l.productId === product.id);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.productId === product.id
                  ? { ...l, quantity: l.quantity + 1, available: product.stock }
                  : l,
              ),
            };
          }
          return {
            // Newest line first, like a till roll read from the top.
            lines: [
              {
                productId: product.id,
                name: product.name,
                brand: product.brand,
                unit: product.unit,
                category: product.category.name,
                department,
                unitPrice: product.price,
                taxRate: product.taxRate,
                quantity: 1,
                available: product.stock,
              },
              ...state.lines,
            ],
          };
        }),
      setQuantity: (productId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.productId !== productId)
              : state.lines.map((l) => (l.productId === productId ? { ...l, quantity } : l)),
        })),
      removeLine: (productId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.productId !== productId) })),
      setCustomer: (customer) => set({ customer, redeemPoints: 0 }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setTendered: (tendered) => set({ tendered }),
      setRedeemPoints: (redeemPoints) => set({ redeemPoints }),
      reset: () => set(fresh()),
    }),
    { name: 'quickbill-pos-bill', storage: createJSONStorage(() => sessionStorage) },
  ),
);
