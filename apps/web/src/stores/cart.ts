import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { StoreProductDTO } from '@quickbill/shared';

export interface CartLine {
  productId: string;
  slug: string;
  name: string;
  brand: string | null;
  unit: string;
  department: string;
  category: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  add: (product: StoreProductDTO, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  /** Applies current prices from the server and drops products no longer sold. */
  sync: (products: StoreProductDTO[]) => void;
  clear: () => void;
}

const MAX_QTY = 20;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (product, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.productId === product.id);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.productId === product.id
                  ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + quantity) }
                  : l,
              ),
            };
          }
          return {
            lines: [
              ...state.lines,
              {
                productId: product.id,
                slug: product.slug,
                name: product.name,
                brand: product.brand,
                unit: product.unit,
                department: product.category.department,
                category: product.category.name,
                price: product.price,
                imageUrl: product.imageUrl,
                quantity: Math.min(MAX_QTY, quantity),
              },
            ],
          };
        }),
      setQuantity: (productId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.productId !== productId)
              : state.lines.map((l) =>
                  l.productId === productId ? { ...l, quantity: Math.min(MAX_QTY, quantity) } : l,
                ),
        })),
      remove: (productId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.productId !== productId) })),
      sync: (products) =>
        set((state) => {
          const byId = new Map(products.map((p) => [p.id, p]));
          return {
            lines: state.lines.flatMap((l) => {
              const p = byId.get(l.productId);
              return p ? [{ ...l, price: p.price, name: p.name, imageUrl: p.imageUrl }] : [];
            }),
          };
        }),
      clear: () => set({ lines: [] }),
    }),
    { name: 'quickbill-cart', storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.quantity, 0);
export const cartSubtotal = (lines: CartLine[]) =>
  lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
