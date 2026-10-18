import type {
  DepartmentDTO,
  StorefrontQuery,
  StoreProductDTO,
  StoreSearchResult,
} from '@quickbill/shared';
import { addDays, localDate, localDayRange } from '../../lib/dates';
import { notFound } from '../../lib/errors';
import { paginate, paginated } from '../../lib/pagination';
import { prisma, type Prisma } from '../../lib/prisma';
import { hybridSearch } from '../ai/search';
import { frequentlyBoughtTogether, recommendedFor, similarProducts } from '../ai/recommendations';
import { getTopProducts } from '../analytics/analytics.service';
import { toStoreProductDTO } from '../catalog/mappers';

const publicWhere = { isActive: true, isPublished: true } satisfies Prisma.ProductWhereInput;

/** Loads products by id and returns them in the given order. */
async function productsInOrder(ids: string[]): Promise<StoreProductDTO[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.product.findMany({
    where: { id: { in: ids }, ...publicWhere },
    include: { category: true },
  });
  const byId = new Map(rows.map((p) => [p.id, p]));
  return ids.flatMap((id) => {
    const p = byId.get(id);
    return p ? [toStoreProductDTO(p)] : [];
  });
}

export async function listDepartments(): Promise<DepartmentDTO[]> {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: { where: publicWhere } } } },
  });
  const departments = new Map<string, DepartmentDTO>();
  for (const c of categories) {
    if (c._count.products === 0) continue;
    const dept = departments.get(c.department) ?? { name: c.department, categories: [] };
    dept.categories.push({ name: c.name, slug: c.slug, productCount: c._count.products });
    departments.set(c.department, dept);
  }
  return [...departments.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const BROWSE_SORTS: Record<StorefrontQuery['sort'], Prisma.ProductOrderByWithRelationInput[]> = {
  relevance: [{ ratingCount: 'desc' }, { name: 'asc' }],
  newest: [{ createdAt: 'desc' }],
  price_asc: [{ price: 'asc' }],
  price_desc: [{ price: 'desc' }],
  rating: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }],
};

export async function searchProducts(query: StorefrontQuery): Promise<StoreSearchResult> {
  const filters = {
    category: query.category,
    department: query.department,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
  };

  if (!query.q) {
    const where: Prisma.ProductWhereInput = {
      ...publicWhere,
      ...(filters.category || filters.department
        ? {
            category: {
              ...(filters.category ? { slug: filters.category } : {}),
              ...(filters.department ? { department: filters.department } : {}),
            },
          }
        : {}),
      ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
        ? { price: { gte: filters.minPrice, lte: filters.maxPrice } }
        : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: [...BROWSE_SORTS[query.sort], { id: 'asc' }],
        ...paginate(query.page, query.pageSize),
      }),
      prisma.product.count({ where }),
    ]);
    return {
      ...paginated(rows.map(toStoreProductDTO), total, query.page, query.pageSize),
      mode: 'browse',
    };
  }

  const { mode, ranked } = await hybridSearch(query.q, filters);
  let products = await productsInOrder(ranked.map((r) => r.id));
  if (query.sort === 'price_asc') products = products.sort((a, b) => a.price - b.price);
  if (query.sort === 'price_desc') products = products.sort((a, b) => b.price - a.price);
  if (query.sort === 'rating') products = products.sort((a, b) => b.ratingAvg - a.ratingAvg);
  const { skip, take } = paginate(query.page, query.pageSize);
  return {
    ...paginated(products.slice(skip, skip + take), products.length, query.page, query.pageSize),
    mode,
  };
}

export async function getProductPage(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, ...publicWhere },
    include: { category: true },
  });
  if (!product) throw notFound('Product');
  const [boughtTogetherIds, similarIds] = await Promise.all([
    frequentlyBoughtTogether(product.id, 4),
    similarProducts(product.id, 9),
  ]);
  const boughtTogether = await productsInOrder(boughtTogetherIds);
  const shown = new Set([product.id, ...boughtTogetherIds]);
  const similar = (await productsInOrder(similarIds)).filter((p) => !shown.has(p.id)).slice(0, 8);
  return { product: toStoreProductDTO(product), boughtTogether, similar };
}

export async function getHome(userId?: string) {
  const today = localDate();
  const last30 = localDayRange(addDays(today, -29), today);
  const [bestsellerRows, dealRows, newRows, forYouIds, departments] = await Promise.all([
    getTopProducts(last30, { limit: 16, rankBy: 'units' }),
    prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Product"
      WHERE "isActive" AND "isPublished" AND stock > 0 AND "compareAtPrice" > price
      ORDER BY ("compareAtPrice" - price)::float8 / "compareAtPrice" DESC LIMIT 8`,
    prisma.product.findMany({
      where: { ...publicWhere, stock: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
      take: 8,
    }),
    userId ? recommendedFor(userId, 8) : Promise.resolve([]),
    listDepartments(),
  ]);
  const [bestsellers, deals, newArrivals, forYou] = await Promise.all([
    productsInOrder(bestsellerRows.map((r) => r.productId)).then((p) =>
      p.filter((x) => x.stockLevel !== 'out').slice(0, 8),
    ),
    productsInOrder(dealRows.map((r) => r.id)),
    productsInOrder(newRows.map((r) => r.id)),
    productsInOrder(forYouIds),
  ]);
  return { bestsellers, deals, newArrivals, forYou, departments };
}

/** Cart validation: current prices and availability for the given products. */
export async function getProductsByIds(ids: string[]): Promise<StoreProductDTO[]> {
  return productsInOrder([...new Set(ids)].slice(0, 100));
}
