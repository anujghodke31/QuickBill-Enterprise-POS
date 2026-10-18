import { Minus, Plus } from 'lucide-react';
import { Link } from 'react-router';
import type { StockLevel, StoreProductDTO } from '@quickbill/shared';
import { Packshot, type PackshotProduct } from '@/components/packshot';
import { cn } from '@/lib/cn';
import { formatINR } from '@/lib/format';
import { useCart } from '@/stores/cart';

export function toPackshot(p: StoreProductDTO): PackshotProduct {
  return {
    name: p.name,
    brand: p.brand,
    unit: p.unit,
    imageUrl: p.imageUrl,
    department: p.category.department,
    category: p.category.name,
  };
}

export function discountPercent(price: number, mrp: number | null): number | null {
  if (!mrp || mrp <= price) return null;
  return Math.round(((mrp - price) / mrp) * 100);
}

export function PriceTag({
  price,
  mrp,
  size = 'md',
}: {
  price: number;
  mrp: number | null;
  size?: 'md' | 'lg';
}) {
  const off = discountPercent(price, mrp);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span
        className={cn(
          'font-semibold text-ink tabular-nums',
          size === 'lg' ? 'text-3xl' : 'text-[15px]',
        )}
      >
        {formatINR(price)}
      </span>
      {off !== null && mrp !== null && (
        <>
          <span
            className={cn(
              'text-ink-faint line-through tabular-nums',
              size === 'lg' ? 'text-base' : 'text-xs',
            )}
          >
            <span className="sr-only">MRP </span>
            {formatINR(mrp)}
          </span>
          <span
            className={cn('font-semibold text-leaf-700', size === 'lg' ? 'text-base' : 'text-xs')}
          >
            {off}% off
          </span>
        </>
      )}
    </div>
  );
}

export function stockWording(level: StockLevel): { text: string; className: string } | null {
  if (level === 'out') return { text: 'Out of stock', className: 'text-chilli-600' };
  if (level === 'low') return { text: 'Only a few left', className: 'text-turmeric-800' };
  return null;
}

export function QuantityStepper({
  value,
  onChange,
  max = 20,
  size = 'md',
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  label: string;
}) {
  const box = size === 'sm' ? 'h-8' : size === 'lg' ? 'h-12' : 'h-10';
  const btn = size === 'sm' ? 'w-8' : size === 'lg' ? 'w-12' : 'w-10';
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-peacock-600 bg-surface text-peacock-700',
        box,
      )}
      role="group"
      aria-label={`Quantity of ${label}`}
    >
      <button
        type="button"
        className={cn('grid h-full place-items-center rounded-l-lg hover:bg-peacock-50', btn)}
        onClick={() => onChange(value - 1)}
        aria-label={value <= 1 ? `Remove ${label}` : `Decrease quantity of ${label}`}
      >
        <Minus className="size-4" />
      </button>
      <span className="min-w-7 text-center font-semibold text-ink tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={cn(
          'grid h-full place-items-center rounded-r-lg hover:bg-peacock-50 disabled:opacity-40',
          btn,
        )}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={`Increase quantity of ${label}`}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

/** Add button that turns into a stepper once the product is in the cart. */
export function AddToCartControl({
  product,
  size = 'sm',
  className,
}: {
  product: StoreProductDTO;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const line = useCart((s) => s.lines.find((l) => l.productId === product.id));
  const add = useCart((s) => s.add);
  const setQuantity = useCart((s) => s.setQuantity);

  if (product.stockLevel === 'out') {
    return (
      <span
        className={cn(
          'inline-flex items-center text-sm text-ink-faint',
          size === 'sm' ? 'h-8' : 'h-10',
          className,
        )}
      >
        Out of stock
      </span>
    );
  }
  if (line) {
    return (
      <div className={className}>
        <QuantityStepper
          value={line.quantity}
          onChange={(q) => setQuantity(product.id, q)}
          size={size}
          label={product.name}
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => add(product)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-peacock-600 px-3 font-semibold text-peacock-700 transition-colors hover:bg-peacock-600 hover:text-white',
        size === 'sm' ? 'h-8 text-sm' : 'h-10',
        className,
      )}
      aria-label={`Add ${product.name} to cart`}
    >
      <Plus className="size-4" /> Add
    </button>
  );
}

export function ProductCard({
  product,
  className,
}: {
  product: StoreProductDTO;
  className?: string;
}) {
  const stock = stockWording(product.stockLevel);
  return (
    <article className={cn('group flex flex-col', className)}>
      <Link
        to={`/p/${product.slug}`}
        className="block overflow-hidden rounded-xl focus-visible:outline-offset-4"
        aria-label={product.name}
      >
        <Packshot
          product={toPackshot(product)}
          className={cn(
            'aspect-square w-full rounded-xl transition-transform duration-300 group-hover:scale-[1.02]',
            product.stockLevel === 'out' && 'opacity-60 grayscale-[0.5]',
          )}
        />
      </Link>
      <div className="mt-3 flex flex-1 flex-col">
        <Link
          to={`/p/${product.slug}`}
          className="line-clamp-2 leading-snug text-ink hover:text-peacock-700"
        >
          {product.name}
        </Link>
        <p className="mt-0.5 text-sm text-ink-faint">{product.unit}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0">
            <PriceTag price={product.price} mrp={product.compareAtPrice} />
            {stock && product.stockLevel === 'low' && (
              <p className={cn('mt-0.5 text-xs', stock.className)}>{stock.text}</p>
            )}
          </div>
          <AddToCartControl product={product} />
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="aspect-square w-full animate-pulse rounded-xl bg-ink/[0.06]" />
      <div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-ink/[0.06]" />
      <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-ink/[0.06]" />
      <div className="mt-4 h-8 w-full animate-pulse rounded bg-ink/[0.06]" />
    </div>
  );
}

export function ProductGrid({
  products,
  loading,
  skeletons = 8,
}: {
  products?: StoreProductDTO[];
  loading?: boolean;
  skeletons?: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {loading
        ? Array.from({ length: skeletons }, (_, i) => <ProductCardSkeleton key={i} />)
        : products?.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}
