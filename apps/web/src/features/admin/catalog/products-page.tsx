import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Package, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import type { Paginated, ProductDTO, ProductListQuery } from '@quickbill/shared';
import { Packshot } from '@/components/packshot';
import { Button } from '@/components/ui/button';
import {
  Badge,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  Panel,
  Table,
  Td,
  Th,
} from '@/components/ui/display';
import { Segmented, Select } from '@/components/ui/form';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { canManage, useAuth } from '@/stores/auth';
import { rowLinkClass, SearchField, SkeletonRows, useListParams } from '../sales/list-params';
import { groupByDepartment, toPackshot, useCategories } from './queries';

type Status = ProductListQuery['status'];
type Sort = ProductListQuery['sort'];

const STATUS_FILTERS: { value: Status; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'low', label: 'Running low' },
  { value: 'out', label: 'Out of stock' },
  { value: 'expiring', label: 'Expiring' },
  { value: 'unpublished', label: 'Hidden from shop' },
];

const SORTS: { value: Sort; label: string }[] = [
  { value: 'name', label: 'Name, A to Z' },
  { value: 'stock', label: 'Lowest stock first' },
  { value: 'price', label: 'Highest price first' },
  { value: 'updated', label: 'Recently updated' },
];

export function StockBadge({ product }: { product: Pick<ProductDTO, 'stock' | 'reorderPoint'> }) {
  if (product.stock <= 0) return <Badge tone="chilli">Out</Badge>;
  if (product.stock <= product.reorderPoint) return <Badge tone="turmeric">Low</Badge>;
  return null;
}

export default function ProductsPage() {
  useDocumentTitle('Products');
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const { values, page, set } = useListParams({
    q: '',
    categoryId: '',
    status: 'all' as Status,
    sort: 'name' as Sort,
  });
  const categories = useCategories();

  const products = useQuery({
    queryKey: ['products', values, page],
    queryFn: () =>
      api.get<Paginated<ProductDTO>>('/catalog/products', {
        q: values.q,
        categoryId: values.categoryId,
        status: values.status,
        sort: values.sort,
        page,
        pageSize: 25,
      }),
    placeholderData: keepPreviousData,
  });

  const filtered = values.q || values.categoryId || values.status !== 'all';

  return (
    <>
      <PageHeader
        title="Products"
        description="Everything on the shelves and in the online shop."
        actions={
          canManage(user) && (
            <Button asChild>
              <Link to="/admin/products/new">
                <Plus /> Add product
              </Link>
            </Button>
          )
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <SearchField
          value={values.q}
          onChange={(q) => set({ q })}
          placeholder="Name, brand, SKU or barcode"
        />
        <Select
          aria-label="Category"
          value={values.categoryId}
          onChange={(e) => set({ categoryId: e.target.value })}
          className="w-full sm:w-56"
        >
          <option value="">All categories</option>
          {groupByDepartment(categories.data ?? []).map(([department, list]) => (
            <optgroup key={department} label={department}>
              {list.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
        <Select
          aria-label="Sort products"
          value={values.sort}
          onChange={(e) => set({ sort: e.target.value as Sort })}
          className="w-full sm:w-52"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="mb-4 max-w-full relative overflow-x-auto">
        <Segmented
          value={values.status}
          options={STATUS_FILTERS}
          onChange={(status) => set({ status })}
        />
      </div>

      {products.isError && <ErrorState error={products.error} onRetry={() => products.refetch()} />}

      <Panel className="overflow-hidden">
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>Category</Th>
              <Th className="text-right">Price</Th>
              <Th className="text-right">In stock</Th>
              <Th>Shop</Th>
            </tr>
          </thead>
          <tbody>
            {products.isPending ? (
              <SkeletonRows cols={5} />
            ) : (
              products.data?.items.map((p) => (
                <tr
                  key={p.id}
                  className={rowLinkClass}
                  onClick={() => navigate(`/admin/products/${p.id}`)}
                >
                  <Td>
                    <div className="flex items-center gap-3">
                      <Packshot
                        product={toPackshot(p, categories.data)}
                        size="xs"
                        className="size-10 shrink-0 rounded-lg"
                      />
                      <div className="min-w-0">
                        <Link
                          to={`/admin/products/${p.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="block truncate font-medium hover:text-peacock-600"
                        >
                          {p.name}
                        </Link>
                        <span className="text-xs text-ink-faint">
                          {p.unit}
                          <span className="ml-2 tabular-nums">{p.sku}</span>
                        </span>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-ink-soft">{p.category.name}</Td>
                  <Td className="text-right whitespace-nowrap">
                    <span className="tabular-nums">{formatINR(p.price)}</span>
                    {p.compareAtPrice && p.compareAtPrice > p.price && (
                      <span className="block text-xs text-ink-faint line-through tabular-nums">
                        {formatINR(p.compareAtPrice)}
                      </span>
                    )}
                  </Td>
                  <Td className="text-right">
                    <span className="inline-flex items-center gap-2">
                      <StockBadge product={p} />
                      <span className="font-medium tabular-nums">{p.stock}</span>
                    </span>
                  </Td>
                  <Td>
                    {p.isPublished ? <Badge tone="leaf">Listed</Badge> : <Badge>Hidden</Badge>}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
        {products.data && products.data.items.length === 0 && (
          <EmptyState
            icon={<Package />}
            title={filtered ? 'No products match' : 'No products yet'}
            action={
              filtered ? (
                <Button
                  variant="secondary"
                  onClick={() => set({ q: '', categoryId: '', status: 'all' })}
                >
                  Clear filters
                </Button>
              ) : (
                canManage(user) && (
                  <Button asChild>
                    <Link to="/admin/products/new">Add product</Link>
                  </Button>
                )
              )
            }
          >
            {filtered
              ? 'Try a different search or category.'
              : 'Add your first product to start selling.'}
          </EmptyState>
        )}
        {products.data && (
          <Pagination
            page={products.data.page}
            totalPages={products.data.totalPages}
            total={products.data.total}
            onPage={(p) => set({ page: p })}
          />
        )}
      </Panel>
    </>
  );
}
