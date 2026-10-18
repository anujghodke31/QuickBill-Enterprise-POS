import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import type { DepartmentDTO, StoreProductDTO, StoreSearchResult } from '@quickbill/shared';
import { departmentStyle } from '@/components/packshot';
import { ErrorState } from '@/components/ui/display';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { useAuth } from '@/stores/auth';
import { discountPercent } from './components/product-card';
import { ProductRail } from './components/product-rail';
import { SearchBox } from './components/search-box';

interface HomeData {
  bestsellers: StoreProductDTO[];
  deals: StoreProductDTO[];
  newArrivals: StoreProductDTO[];
  forYou: StoreProductDTO[];
  departments: DepartmentDTO[];
}

const EXAMPLES = [
  'something for a headache',
  'party snacks',
  'healthy breakfast',
  'diwali gifts',
  'loose motions',
];
const SLIP_QUERY = EXAMPLES[0]!;

/** A printed slip showing what the intent search really returns for one example. */
function SearchSlip() {
  const { data } = useQuery({
    queryKey: ['shop', 'search', { q: SLIP_QUERY, pageSize: 3 }],
    queryFn: () => api.get<StoreSearchResult>('/shop/products', { q: SLIP_QUERY, pageSize: 3 }),
    staleTime: 10 * 60_000,
  });
  return (
    <div className="receipt w-full max-w-xs rotate-[1.5deg] px-6 font-mono text-[13px] text-ink shadow-float">
      <p className="text-ink-faint">You typed</p>
      <p className="mt-0.5 font-semibold">“{SLIP_QUERY}”</p>
      <div className="receipt-rule my-3" />
      <ul className="min-h-[84px] space-y-2">
        {data
          ? data.items.map((p) => (
              <li key={p.id} className="flex justify-between gap-3">
                <Link to={`/p/${p.slug}`} className="truncate hover:underline">
                  {p.name}
                </Link>
                <span className="shrink-0 tabular-nums">{formatINR(p.price)}</span>
              </li>
            ))
          : Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="h-5 animate-pulse rounded bg-ink/[0.06]" />
            ))}
      </ul>
      <div className="receipt-rule my-3" />
      <p className="text-ink-faint">Matched by what each product is for, not only by its name.</p>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line bg-turmeric-50">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1fr_auto]">
        <div className="max-w-3xl">
          <h1 className="type-display text-[52px] text-ink sm:text-7xl lg:text-[88px]">
            Ask for it the way you would at the counter.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">
            Search by what you need, not just by name. Groceries and household essentials, delivered
            across Pune from our Baner Road store.
          </p>
          <SearchBox
            size="lg"
            className="mt-8 max-w-2xl"
            placeholder="Try “something for a headache”"
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-soft">Try</span>
            {EXAMPLES.map((q) => (
              <Link
                key={q}
                to={`/search?q=${encodeURIComponent(q)}`}
                className="rounded-full border border-turmeric-300 bg-surface px-3 py-1 text-sm text-ink hover:border-turmeric-600 hover:bg-turmeric-100"
              >
                {q}
              </Link>
            ))}
          </div>
        </div>
        <div className="hidden justify-center lg:flex">
          <SearchSlip />
        </div>
      </div>
    </section>
  );
}

function AisleTiles({ departments }: { departments: DepartmentDTO[] }) {
  return (
    <section className="py-10" aria-label="Shop by aisle">
      <h2 className="type-heading mb-4 text-2xl">Shop by aisle</h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {departments.map((d) => {
          const style = departmentStyle(d.name);
          const count = d.categories.reduce((s, c) => s + c.productCount, 0);
          return (
            <li key={d.name}>
              <Link
                to={`/search?department=${encodeURIComponent(d.name)}`}
                className="flex h-full flex-col rounded-2xl p-4 transition-colors hover:brightness-[0.97]"
                style={{ background: style.tint }}
              >
                <span className="type-heading text-lg" style={{ color: style.pack }}>
                  {d.name}
                </span>
                <span className="mt-1 line-clamp-2 text-sm text-ink-soft">
                  {d.categories.map((c) => c.name).join(', ')}
                </span>
                <span className="mt-auto pt-4 text-sm font-medium text-ink">{count} products</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function HomePage() {
  useDocumentTitle('Groceries delivered across Pune');
  const user = useAuth((s) => s.user);
  const { data, isLoading, error, refetch } = useQuery({
    // The home page personalises for signed-in shoppers, so cache per user.
    queryKey: ['shop', 'home', user?.id ?? 'guest'],
    queryFn: () => api.get<HomeData>('/shop/home'),
  });

  const bestDeal = data?.deals.reduce(
    (best, p) => Math.max(best, discountPercent(p.price, p.compareAtPrice) ?? 0),
    0,
  );

  return (
    <>
      <Hero />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {error && (
          <div className="pt-8">
            <ErrorState error={error} onRetry={() => refetch()} />
          </div>
        )}
        {user && data && data.forYou.length > 0 && (
          <ProductRail
            title={`Picked for you, ${user.name.split(' ')[0]}`}
            description="Based on what you have bought before, in store and online."
            products={data.forYou}
          />
        )}
        <ProductRail
          title="Festive deals"
          description={bestDeal ? `Up to ${bestDeal}% below MRP while stocks last.` : undefined}
          products={data?.deals}
          loading={isLoading}
        />
        {data && <AisleTiles departments={data.departments} />}
        <ProductRail
          title="Bestsellers"
          description="What our neighbours bought most this month."
          products={data?.bestsellers}
          loading={isLoading}
        />
        <ProductRail
          title="New on the shelves"
          products={data?.newArrivals}
          loading={isLoading}
          action={
            <Link
              to="/search?sort=newest"
              className="text-sm font-medium text-peacock-600 hover:underline"
            >
              See all new products
            </Link>
          }
        />
      </div>
    </>
  );
}
