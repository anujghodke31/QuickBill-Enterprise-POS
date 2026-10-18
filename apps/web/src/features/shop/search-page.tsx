import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { Dialog as D } from 'radix-ui';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { DepartmentDTO, StorefrontQuery, StoreSearchResult } from '@quickbill/shared';
import { departmentStyle } from '@/components/packshot';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Pagination } from '@/components/ui/display';
import { Select } from '@/components/ui/form';
import { SheetContent } from '@/components/ui/overlay';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useDocumentTitle } from '@/lib/hooks';
import { ProductGrid } from './components/product-card';
import { useDepartments } from './components/queries';

const PAGE_SIZE = 24;

const PRICE_BUCKETS = [
  { id: 'any', label: 'Any price' },
  { id: 'u50', label: 'Under ₹50', max: 4_999 },
  { id: '50-200', label: '₹50 to ₹200', min: 5_000, max: 20_000 },
  { id: '200-500', label: '₹200 to ₹500', min: 20_000, max: 50_000 },
  { id: 'o500', label: 'Over ₹500', min: 50_000 },
] as const;

const SUGGESTIONS = [
  'something for a headache',
  'party snacks',
  'healthy breakfast',
  'baby care',
  'tea time',
];

type Sort = StorefrontQuery['sort'];

function useSearchState() {
  const [params, setParams] = useSearchParams();
  const num = (key: string) => {
    const v = params.get(key);
    return v && /^\d+$/.test(v) ? Number(v) : undefined;
  };
  const state = {
    q: params.get('q') ?? undefined,
    department: params.get('department') ?? undefined,
    category: params.get('category') ?? undefined,
    sort: (params.get('sort') as Sort | null) ?? 'relevance',
    page: num('page') ?? 1,
    minPrice: num('minPrice'),
    maxPrice: num('maxPrice'),
  };
  /** Applies changes to the URL; any change other than paging returns to page 1. */
  const update = (changes: Record<string, string | number | undefined>) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(changes)) {
        if (value === undefined || value === '') next.delete(key);
        else next.set(key, String(value));
      }
      if (!('page' in changes)) next.delete('page');
      return next;
    });
  };
  return { state, update };
}

function categoryName(departments: DepartmentDTO[] | undefined, slug: string) {
  for (const d of departments ?? []) {
    const c = d.categories.find((x) => x.slug === slug);
    if (c) return { name: c.name, department: d.name };
  }
  return null;
}

function FilterPanel({ onPick }: { onPick?: () => void }) {
  const { state, update } = useSearchState();
  const { data: departments } = useDepartments();
  const activeDept =
    state.department ??
    (state.category ? categoryName(departments, state.category)?.department : undefined);
  const priceBucket =
    PRICE_BUCKETS.find(
      (b) =>
        b.id !== 'any' &&
        ('min' in b ? b.min : undefined) === state.minPrice &&
        ('max' in b ? b.max : undefined) === state.maxPrice,
    )?.id ?? 'any';

  const pick = (changes: Record<string, string | number | undefined>) => {
    update(changes);
    onPick?.();
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-2 font-semibold">Aisle</p>
        <ul className="space-y-0.5">
          <li>
            <button
              onClick={() => pick({ department: undefined, category: undefined })}
              className={cn(
                'w-full rounded-lg px-2 py-1.5 text-left text-ink-soft hover:bg-ink/[0.04] hover:text-ink',
                !activeDept && 'font-medium text-ink',
              )}
            >
              All aisles
            </button>
          </li>
          {departments?.map((d) => {
            const open = activeDept === d.name;
            return (
              <li key={d.name}>
                <button
                  onClick={() => pick({ department: d.name, category: undefined })}
                  aria-expanded={open}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-ink-soft hover:bg-ink/[0.04] hover:text-ink',
                    open && !state.category && 'bg-ink/[0.05] font-medium text-ink',
                    open && state.category && 'font-medium text-ink',
                  )}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: departmentStyle(d.name).pack }}
                  />
                  {d.name}
                </button>
                {open && (
                  <ul className="mt-0.5 mb-2 ml-3 space-y-0.5 border-l border-line pl-3">
                    {d.categories.map((c) => (
                      <li key={c.slug}>
                        <button
                          // Category alone is the narrower filter; department is implied by it.
                          onClick={() => pick({ category: c.slug, department: undefined })}
                          className={cn(
                            'flex w-full justify-between gap-2 rounded-md px-2 py-1 text-left text-sm text-ink-soft hover:bg-ink/[0.04] hover:text-ink',
                            state.category === c.slug && 'bg-ink/[0.05] font-medium text-ink',
                          )}
                        >
                          <span>{c.name}</span>
                          <span className="text-ink-faint tabular-nums">{c.productCount}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <fieldset>
        <legend className="mb-2 font-semibold">Price</legend>
        <div className="space-y-1">
          {PRICE_BUCKETS.map((b) => (
            <label
              key={b.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-ink-soft hover:bg-ink/[0.04] hover:text-ink"
            >
              <input
                type="radio"
                name="price"
                className="size-4 accent-peacock-600"
                checked={priceBucket === b.id}
                onChange={() =>
                  pick({
                    minPrice: 'min' in b ? b.min : undefined,
                    maxPrice: 'max' in b ? b.max : undefined,
                  })
                }
              />
              {b.label}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export default function SearchPage() {
  const { state, update } = useSearchState();
  const { data: departments } = useDepartments();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const category = state.category ? categoryName(departments, state.category) : null;
  const title = state.q
    ? `Results for “${state.q}”`
    : (category?.name ??
      state.department ??
      (state.sort === 'newest' ? 'New on the shelves' : 'All products'));
  useDocumentTitle(state.q ? `${state.q}` : title);

  const query = {
    q: state.q,
    department: state.category ? undefined : state.department,
    category: state.category,
    sort: state.sort,
    page: state.page,
    pageSize: PAGE_SIZE,
    minPrice: state.minPrice,
    maxPrice: state.maxPrice,
  };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['shop', 'search', query],
    queryFn: () => api.get<StoreSearchResult>('/shop/products', query),
    placeholderData: keepPreviousData,
  });

  const activeChips = [
    category && { label: category.name, clear: { category: undefined } },
    !category && state.department && { label: state.department, clear: { department: undefined } },
    (state.minPrice !== undefined || state.maxPrice !== undefined) && {
      label:
        PRICE_BUCKETS.find(
          (b) =>
            ('min' in b ? b.min : undefined) === state.minPrice &&
            ('max' in b ? b.max : undefined) === state.maxPrice,
        )?.label ?? 'Price range',
      clear: { minPrice: undefined, maxPrice: undefined },
    },
  ].filter(Boolean) as { label: string; clear: Record<string, undefined> }[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <FilterPanel />
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              {category && (
                <p className="mb-1 text-sm text-ink-faint">
                  <Link
                    to={`/search?department=${encodeURIComponent(category.department)}`}
                    className="hover:text-ink"
                  >
                    {category.department}
                  </Link>
                </p>
              )}
              <h1 className="type-heading text-3xl break-words">{title}</h1>
              {data && (
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-soft">
                  <span>
                    {data.total} {data.total === 1 ? 'product' : 'products'}
                  </span>
                  {data.mode === 'hybrid' && data.total > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-peacock-700">
                      <Sparkles className="size-4" /> Matched by meaning as well as keywords
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <D.Root open={filtersOpen} onOpenChange={setFiltersOpen}>
                <D.Trigger asChild>
                  <Button variant="secondary" className="lg:hidden">
                    <SlidersHorizontal /> Filters
                  </Button>
                </D.Trigger>
                <SheetContent title="Filters" side="left" className="max-w-xs">
                  <div className="p-5">
                    <FilterPanel onPick={() => setFiltersOpen(false)} />
                  </div>
                </SheetContent>
              </D.Root>
              <label className="sr-only" htmlFor="sort">
                Sort by
              </label>
              <Select
                id="sort"
                value={state.sort}
                onChange={(e) =>
                  update({ sort: e.target.value === 'relevance' ? undefined : e.target.value })
                }
                className="w-44"
              >
                <option value="relevance">{state.q ? 'Best match' : 'Most popular'}</option>
                <option value="newest">Newest first</option>
                <option value="price_asc">Price, low to high</option>
                <option value="price_desc">Price, high to low</option>
                <option value="rating">Highest rated</option>
              </Select>
            </div>
          </div>

          {activeChips.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {activeChips.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => update(chip.clear)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface py-1 pr-2 pl-3 text-sm hover:border-ink-faint"
                  aria-label={`Remove filter ${chip.label}`}
                >
                  {chip.label} <X className="size-3.5 text-ink-faint" />
                </button>
              ))}
            </div>
          )}

          <div className={cn('mt-8 transition-opacity', isFetching && !isLoading && 'opacity-60')}>
            {error ? (
              <ErrorState error={error} onRetry={() => refetch()} />
            ) : data && data.items.length === 0 ? (
              <EmptyState
                title={
                  state.q ? `Nothing found for “${state.q}”` : 'No products match these filters'
                }
                action={
                  activeChips.length > 0 ? (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        update({
                          department: undefined,
                          category: undefined,
                          minPrice: undefined,
                          maxPrice: undefined,
                        })
                      }
                    >
                      Clear filters
                    </Button>
                  ) : undefined
                }
              >
                <span className="block">Try describing what you need it for, or one of these:</span>
                <span className="mt-3 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <Link
                      key={s}
                      to={`/search?q=${encodeURIComponent(s)}`}
                      className="rounded-full border border-line-strong bg-surface px-3 py-1 text-sm text-ink hover:border-peacock-500"
                    >
                      {s}
                    </Link>
                  ))}
                </span>
              </EmptyState>
            ) : (
              <ProductGrid products={data?.items} loading={isLoading} skeletons={12} />
            )}
          </div>

          {data && (
            <div className="mt-8 border-t border-line">
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                onPage={(page) => {
                  update({ page });
                  window.scrollTo({ top: 0 });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
