import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ScanBarcode, Search } from 'lucide-react';
import { useMemo, useState, type RefObject } from 'react';
import { toast } from 'sonner';
import type { CategoryDTO, Paginated, ProductDTO } from '@quickbill/shared';
import { Packshot } from '@/components/packshot';
import { Kbd, Skeleton } from '@/components/ui/display';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatINR } from '@/lib/format';
import { useDebounced } from '@/lib/hooks';
import { usePos } from './pos-store';
import { useBarcodeScanner } from './use-barcode-scanner';

export function useCategories() {
  return useQuery({
    queryKey: ['catalog', 'categories'],
    queryFn: () => api.get<CategoryDTO[]>('/catalog/categories'),
    staleTime: 5 * 60_000,
  });
}

export function ProductBrowser({ searchRef }: { searchRef: RefObject<HTMLInputElement | null> }) {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const q = useDebounced(search.trim(), 150);
  const addProduct = usePos((s) => s.addProduct);
  const lines = usePos((s) => s.lines);

  const categories = useCategories();
  const departmentOf = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c.department])),
    [categories.data],
  );

  const products = useQuery({
    queryKey: ['pos', 'products', q, categoryId],
    queryFn: () =>
      api.get<Paginated<ProductDTO>>('/catalog/products', {
        q: q || undefined,
        categoryId: q ? undefined : (categoryId ?? undefined),
        pageSize: 48,
        sort: 'name',
      }),
    placeholderData: keepPreviousData,
  });

  const add = (product: ProductDTO) => {
    const inBill = lines.find((l) => l.productId === product.id)?.quantity ?? 0;
    if (inBill + 1 > product.stock) {
      toast.error(`Only ${product.stock} × ${product.name} in stock`);
      return;
    }
    addProduct(product, departmentOf.get(product.category.id) ?? '');
  };

  const addByCode = async (code: string) => {
    try {
      const product = await api.get<ProductDTO>(
        `/catalog/products/lookup/${encodeURIComponent(code)}`,
      );
      add(product);
      setSearch('');
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.status === 404
          ? `No product with code ${code}`
          : 'Lookup failed',
      );
    }
  };

  useBarcodeScanner(addByCode);

  const onSubmit = () => {
    const term = search.trim();
    if (!term) return;
    const results = products.data?.items ?? [];
    if (results.length === 1 && q === term) {
      add(results[0]!);
      setSearch('');
    } else if (/^[\w-]{4,}$/.test(term)) {
      void addByCode(term);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-3 border-b border-line bg-paper px-4 pt-4 pb-3 sm:px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="relative"
        >
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-faint" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setSearch('')}
            placeholder="Scan a barcode or type a product name"
            className="h-12 w-full rounded-xl border border-line-strong bg-surface pr-24 pl-12 text-base placeholder:text-ink-faint focus:border-peacock-500 focus:ring-3 focus:ring-peacock-500/15 focus:outline-none"
            aria-label="Find a product"
            autoFocus
          />
          <span className="pointer-events-none absolute top-1/2 right-4 flex -translate-y-1/2 items-center gap-1.5 text-xs text-ink-faint">
            <ScanBarcode className="size-4" /> <Kbd>F2</Kbd>
          </span>
        </form>
        <div className="-mx-1 flex gap-1.5 relative overflow-x-auto px-1 pb-1">
          <button
            onClick={() => setCategoryId(null)}
            className={cn(
              'h-8 shrink-0 rounded-full border px-3 text-sm whitespace-nowrap',
              !categoryId
                ? 'border-ink bg-ink text-white'
                : 'border-line bg-surface text-ink-soft hover:border-line-strong',
            )}
          >
            All
          </button>
          {categories.data?.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCategoryId(c.id);
                setSearch('');
              }}
              className={cn(
                'h-8 shrink-0 rounded-full border px-3 text-sm whitespace-nowrap',
                categoryId === c.id && !q
                  ? 'border-ink bg-ink text-white'
                  : 'border-line bg-surface text-ink-soft hover:border-line-strong',
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {products.isPending ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="h-[118px] rounded-xl" />
            ))}
          </div>
        ) : products.data?.items.length === 0 ? (
          <p className="py-16 text-center text-ink-soft">
            Nothing matches “{q}”. Check the spelling or scan the barcode.
          </p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
            {products.data?.items.map((p) => {
              const out = p.stock <= 0;
              const low = !out && p.stock <= p.reorderPoint;
              return (
                <li key={p.id}>
                  <button
                    onClick={() => add(p)}
                    disabled={out}
                    className="flex h-full w-full flex-col rounded-xl border border-line bg-surface p-2.5 text-left transition-colors hover:border-peacock-500 active:bg-peacock-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex items-start gap-2">
                      <Packshot
                        size="xs"
                        className="size-8 shrink-0 rounded-lg"
                        product={{
                          name: p.name,
                          brand: p.brand,
                          unit: p.unit,
                          imageUrl: p.imageUrl,
                          department: departmentOf.get(p.category.id) ?? '',
                          category: p.category.name,
                        }}
                      />
                      <span className="line-clamp-2 text-[13px] leading-snug font-medium text-ink">
                        {p.name}
                      </span>
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-1 pt-2">
                      <span className="text-xs text-ink-faint">{p.unit}</span>
                      <span className="font-semibold tabular-nums">{formatINR(p.price)}</span>
                    </div>
                    <span
                      className={cn(
                        'mt-1 text-xs tabular-nums',
                        out ? 'text-chilli-600' : low ? 'text-turmeric-800' : 'text-ink-faint',
                      )}
                    >
                      {out ? 'Out of stock' : `${p.stock} in stock`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
