import { beforeEach, describe, expect, it } from 'vitest';
import type { StoreProductDTO } from '@quickbill/shared';
import { cartCount, cartSubtotal, useCart } from './cart';

const product = (id: string, price: number): StoreProductDTO => ({
  id,
  slug: id,
  name: `Product ${id}`,
  brand: 'Brand',
  unit: '1 pc',
  description: '',
  category: { name: 'Bakery', slug: 'bakery', department: 'Fresh' },
  price,
  compareAtPrice: null,
  imageUrl: null,
  tags: [],
  ratingAvg: 4,
  ratingCount: 10,
  stockLevel: 'in',
});

describe('cart store', () => {
  beforeEach(() => useCart.getState().clear());

  it('adds products and merges repeat adds into one line', () => {
    const { add } = useCart.getState();
    add(product('a', 5_000));
    add(product('a', 5_000), 2);
    add(product('b', 2_500));
    const { lines } = useCart.getState();
    expect(lines).toHaveLength(2);
    expect(lines[0]!.quantity).toBe(3);
    expect(cartCount(lines)).toBe(4);
    expect(cartSubtotal(lines)).toBe(17_500);
  });

  it('caps the quantity of a single line', () => {
    useCart.getState().add(product('a', 100), 50);
    expect(useCart.getState().lines[0]!.quantity).toBe(20);
  });

  it('removes a line when its quantity drops to zero', () => {
    const { add, setQuantity } = useCart.getState();
    add(product('a', 100));
    setQuantity('a', 0);
    expect(useCart.getState().lines).toHaveLength(0);
  });

  it('syncs to current server prices and drops products no longer sold', () => {
    const { add, sync } = useCart.getState();
    add(product('a', 5_000));
    add(product('b', 2_500));
    sync([product('a', 4_500)]);
    const { lines } = useCart.getState();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ productId: 'a', price: 4_500 });
  });
});
