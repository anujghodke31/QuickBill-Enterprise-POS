import { useQuery } from '@tanstack/react-query';
import { Check, ShieldCheck, Star, Truck } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import type { StoreProductDTO } from '@quickbill/shared';
import { Packshot } from '@/components/packshot';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/display';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatINR } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { useCart } from '@/stores/cart';
import { PriceTag, QuantityStepper, stockWording, toPackshot } from './components/product-card';
import { ProductRail } from './components/product-rail';

interface ProductPageData {
  product: StoreProductDTO;
  boughtTogether: StoreProductDTO[];
  similar: StoreProductDTO[];
}

function Rating({ avg, count }: { avg: number; count: number }) {
  if (!count) return null;
  return (
    <p className="flex items-center gap-1.5 text-sm text-ink-soft">
      <span className="flex" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={cn(
              'size-4',
              i < Math.round(avg) ? 'fill-turmeric-500 text-turmeric-500' : 'text-line-strong',
            )}
          />
        ))}
      </span>
      <span>
        {avg.toFixed(1)} from {count} ratings
      </span>
    </p>
  );
}

function BoughtTogether({
  product,
  others,
}: {
  product: StoreProductDTO;
  others: StoreProductDTO[];
}) {
  const add = useCart((s) => s.add);
  const available = [product, ...others].filter((p) => p.stockLevel !== 'out');
  const [selected, setSelected] = useState<Set<string>>(() => new Set(available.map((p) => p.id)));
  const chosen = available.filter((p) => selected.has(p.id));
  const total = chosen.reduce((s, p) => s + p.price, 0);

  if (others.length === 0) return null;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className="py-10" aria-labelledby="fbt-heading">
      <h2 id="fbt-heading" className="type-heading text-2xl">
        Frequently bought together
      </h2>
      <p className="mt-0.5 text-ink-soft">
        Shoppers who buy this usually pick these up in the same trip.
      </p>
      <div className="mt-5 flex flex-col gap-6 rounded-2xl border border-line bg-surface p-5 lg:flex-row lg:items-center">
        <ul
          className={cn(
            'grid flex-1 grid-cols-2 gap-4',
            others.length + 1 >= 5 ? 'sm:grid-cols-3 lg:grid-cols-5' : 'sm:grid-cols-4',
          )}
        >
          {[product, ...others].map((p) => {
            const out = p.stockLevel === 'out';
            const on = selected.has(p.id);
            return (
              <li key={p.id}>
                <label
                  className={cn(
                    'block cursor-pointer rounded-xl border-2 p-2 transition-colors',
                    on ? 'border-peacock-600' : 'border-transparent',
                    out && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <div className="relative">
                    <Packshot product={toPackshot(p)} className="aspect-square w-full rounded-lg" />
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={on}
                      disabled={out}
                      onChange={() => toggle(p.id)}
                    />
                    <span
                      aria-hidden
                      className={cn(
                        'absolute top-2 left-2 grid size-6 place-items-center rounded-md border-2 bg-surface peer-focus-visible:outline-2 peer-focus-visible:outline-peacock-500',
                        on ? 'border-peacock-600 bg-peacock-600 text-white' : 'border-line-strong',
                      )}
                    >
                      {on && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-snug">
                    {p.id === product.id && <span className="font-semibold">This item: </span>}
                    {p.name}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">
                    {out ? (
                      <span className="font-normal text-chilli-600">Out of stock</span>
                    ) : (
                      formatINR(p.price)
                    )}
                  </p>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="shrink-0 lg:w-56 lg:border-l lg:border-line lg:pl-6">
          <p className="text-sm text-ink-soft">
            {chosen.length} {chosen.length === 1 ? 'item' : 'items'} selected
          </p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums">{formatINR(total)}</p>
          <Button
            className="mt-4 w-full"
            disabled={chosen.length === 0}
            onClick={() => {
              chosen.forEach((p) => add(p));
              toast.success(
                `Added ${chosen.length} ${chosen.length === 1 ? 'item' : 'items'} to your cart`,
              );
            }}
          >
            Add {chosen.length === available.length ? 'all' : 'selected'} to cart
          </Button>
        </div>
      </div>
    </section>
  );
}

function ProductSkeleton() {
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <Skeleton className="aspect-square w-full rounded-3xl" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-4/5" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

export default function ProductPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['shop', 'product', slug],
    queryFn: () => api.get<ProductPageData>(`/shop/products/${encodeURIComponent(slug)}`),
  });
  const productId = data?.product.id;
  const add = useCart((s) => s.add);
  const inCart = useCart((s) => s.lines.find((l) => l.productId === productId)?.quantity ?? 0);
  useDocumentTitle(data?.product.name ?? 'Product');

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <EmptyState
          title="This product is no longer available"
          action={
            <Button asChild>
              <Link to="/search">Browse all products</Link>
            </Button>
          }
        >
          It may have been discontinued. Try searching for something similar.
        </EmptyState>
      </div>
    );
  }

  const p = data?.product;
  const stock = p ? stockWording(p.stockLevel) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {isLoading && <ProductSkeleton />}
      {p && data && (
        <>
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-faint">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link to="/" className="hover:text-ink">
                  Shop
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link
                  to={`/search?department=${encodeURIComponent(p.category.department)}`}
                  className="hover:text-ink"
                >
                  {p.category.department}
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link to={`/search?category=${p.category.slug}`} className="hover:text-ink">
                  {p.category.name}
                </Link>
              </li>
            </ol>
          </nav>

          <div className="grid gap-10 md:grid-cols-2 lg:gap-16">
            <Packshot
              product={toPackshot(p)}
              size="lg"
              className="aspect-square w-full rounded-3xl"
            />

            <div className="flex flex-col">
              {p.brand && <p className="font-medium text-ink-soft">{p.brand}</p>}
              <h1 className="type-heading mt-1 text-[34px]">{p.name}</h1>
              <p className="mt-1 text-ink-soft">{p.unit}</p>
              <div className="mt-3">
                <Rating avg={p.ratingAvg} count={p.ratingCount} />
              </div>

              <div className="mt-6">
                <PriceTag price={p.price} mrp={p.compareAtPrice} size="lg" />
                <p className="mt-1 text-sm text-ink-faint">Inclusive of all taxes</p>
              </div>

              <p className={cn('mt-4 font-medium', stock ? stock.className : 'text-leaf-700')}>
                {stock ? stock.text : 'In stock'}
              </p>

              {p.stockLevel !== 'out' && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <QuantityStepper
                    value={quantity}
                    onChange={(q) => setQuantity(Math.max(1, q))}
                    size="lg"
                    label={p.name}
                  />
                  <Button
                    size="lg"
                    className="min-w-48 flex-1 sm:flex-none"
                    onClick={() => {
                      add(p, quantity);
                      toast.success(`Added ${quantity} × ${p.name}`, {
                        action: { label: 'View cart', onClick: () => navigate('/cart') },
                      });
                      setQuantity(1);
                    }}
                  >
                    Add to cart
                  </Button>
                </div>
              )}
              {inCart > 0 && (
                <p className="mt-3 text-sm text-ink-soft">
                  {inCart} already in your{' '}
                  <Link to="/cart" className="font-medium text-peacock-600 hover:underline">
                    cart
                  </Link>
                </p>
              )}

              <ul className="mt-8 space-y-2 border-t border-line pt-6 text-sm text-ink-soft">
                <li className="flex items-center gap-2">
                  <Truck className="size-4 text-peacock-600" /> Same-day delivery in Pune on orders
                  placed by 6 pm
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-peacock-600" /> Easy returns within 7 days for
                  unopened items
                </li>
              </ul>

              {p.description && (
                <div className="mt-8">
                  <h2 className="font-semibold">About this product</h2>
                  <p className="mt-2 max-w-prose leading-relaxed text-ink-soft">{p.description}</p>
                </div>
              )}

              {p.tags.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-sm font-semibold">Good for</h2>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {p.tags.map((t) => (
                      <li key={t}>
                        <Link
                          to={`/search?q=${encodeURIComponent(t)}`}
                          className="inline-block rounded-full bg-ink/[0.05] px-3 py-1 text-sm text-ink-soft hover:bg-ink/[0.09] hover:text-ink"
                        >
                          {t}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <BoughtTogether key={p.id} product={p} others={data.boughtTogether} />
          <ProductRail
            title="You might also like"
            description={`Similar to ${p.name}.`}
            products={data.similar}
          />
        </>
      )}
    </div>
  );
}
