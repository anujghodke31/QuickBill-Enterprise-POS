import type { ReactNode } from 'react';
import type { StoreProductDTO } from '@quickbill/shared';
import { ProductCard, ProductCardSkeleton } from './product-card';

/** A titled, horizontally scrolling shelf of products. */
export function ProductRail({
  title,
  description,
  products,
  loading,
  action,
}: {
  title: string;
  description?: ReactNode;
  products?: StoreProductDTO[];
  loading?: boolean;
  action?: ReactNode;
}) {
  if (!loading && (!products || products.length === 0)) return null;
  return (
    <section className="py-8" aria-label={title}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="type-heading text-2xl">{title}</h2>
          {description && <p className="mt-0.5 text-ink-soft">{description}</p>}
        </div>
        {action}
      </div>
      {/* `relative` keeps absolutely positioned children (e.g. sr-only labels) inside the scroller. */}
      <div className="relative -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:-mx-6 sm:px-6">
        {loading
          ? Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="w-[44vw] max-w-52 shrink-0 sm:w-52">
                <ProductCardSkeleton />
              </div>
            ))
          : products!.map((p) => (
              <div key={p.id} className="w-[44vw] max-w-52 shrink-0 snap-start sm:w-52">
                <ProductCard product={p} />
              </div>
            ))}
      </div>
    </section>
  );
}
