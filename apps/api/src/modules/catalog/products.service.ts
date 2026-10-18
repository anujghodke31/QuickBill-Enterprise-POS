import { randomBytes } from 'node:crypto';
import type {
  CategoryDTO,
  CategoryInput,
  Paginated,
  ProductDTO,
  ProductListQuery,
  productInputSchema,
  productUpdateSchema,
} from '@quickbill/shared';
import type { z } from 'zod';
import { conflict, notFound } from '../../lib/errors';
import { paginate, paginated } from '../../lib/pagination';
import { prisma, type Prisma } from '../../lib/prisma';
import { applyStockChange } from '../../lib/stock';
import { slugify } from '../../lib/text';
import { scheduleEmbedding } from '../ai/embeddings';
import { productInclude, toProductDTO } from './mappers';

type ProductCreate = z.output<typeof productInputSchema>;
type ProductUpdate = z.output<typeof productUpdateSchema>;

const EXPIRY_WINDOW_DAYS = 30;

export function expiryCutoff(): Date {
  return new Date(Date.now() + EXPIRY_WINDOW_DAYS * 86_400_000);
}

function buildWhere(query: ProductListQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { isActive: true };
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { brand: { contains: query.q, mode: 'insensitive' } },
      { sku: { contains: query.q, mode: 'insensitive' } },
      { barcode: query.q },
    ];
  }
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.supplierId) where.supplierId = query.supplierId;
  switch (query.status) {
    case 'low':
      where.stock = { gt: 0, lte: prisma.product.fields.reorderPoint };
      break;
    case 'out':
      where.stock = { lte: 0 };
      break;
    case 'expiring':
      where.expiryDate = { not: null, lte: expiryCutoff() };
      break;
    case 'unpublished':
      where.isPublished = false;
      break;
  }
  return where;
}

const SORTS: Record<ProductListQuery['sort'], Prisma.ProductOrderByWithRelationInput> = {
  name: { name: 'asc' },
  stock: { stock: 'asc' },
  price: { price: 'desc' },
  updated: { updatedAt: 'desc' },
};

export async function listProducts(query: ProductListQuery): Promise<Paginated<ProductDTO>> {
  const where = buildWhere(query);
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: [SORTS[query.sort], { id: 'asc' }],
      ...paginate(query.page, query.pageSize),
    }),
    prisma.product.count({ where }),
  ]);
  return paginated(rows.map(toProductDTO), total, query.page, query.pageSize);
}

export async function getProduct(id: string): Promise<ProductDTO> {
  const product = await prisma.product.findUnique({ where: { id }, include: productInclude });
  if (!product) throw notFound('Product');
  return toProductDTO(product);
}

/** Exact barcode or SKU lookup, used by the POS scanner. */
export async function findByCode(code: string): Promise<ProductDTO> {
  const product = await prisma.product.findFirst({
    where: {
      isActive: true,
      OR: [{ barcode: code }, { sku: { equals: code, mode: 'insensitive' } }],
    },
    include: productInclude,
  });
  if (!product) throw notFound(`No product with code "${code}"`);
  return toProductDTO(product);
}

async function uniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name) || 'product';
  let candidate = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await prisma.product.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!clash) return candidate;
    candidate = `${base}-${randomBytes(2).toString('hex')}`;
  }
  return `${base}-${randomBytes(4).toString('hex')}`;
}

function generateSku(): string {
  return `QB-${randomBytes(3).toString('hex').toUpperCase()}`;
}

export async function createProduct(input: ProductCreate, userId: string): Promise<ProductDTO> {
  const slug = await uniqueSlug(input.name);
  const { stock, ...fields } = input;
  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: { ...fields, sku: input.sku ?? generateSku(), slug, stock: 0 },
    });
    if (stock > 0) {
      await applyStockChange(tx, {
        productId: created.id,
        delta: stock,
        reason: 'INITIAL',
        note: 'Opening stock',
        userId,
      });
    }
    return tx.product.findUniqueOrThrow({ where: { id: created.id }, include: productInclude });
  });
  scheduleEmbedding([product.id]);
  return toProductDTO(product);
}

const EMBEDDED_FIELDS = ['name', 'brand', 'description', 'tags', 'categoryId', 'unit'] as const;

export async function updateProduct(id: string, input: ProductUpdate): Promise<ProductDTO> {
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Product');
  // The slug stays stable so storefront links keep working after a rename.
  const product = await prisma.product.update({
    where: { id },
    data: input,
    include: productInclude,
  });
  if (EMBEDDED_FIELDS.some((field) => input[field] !== undefined)) scheduleEmbedding([id]);
  return toProductDTO(product);
}

/** Archives rather than deletes, so past sales keep their product reference. */
export async function archiveProduct(id: string): Promise<void> {
  const { count } = await prisma.product.updateMany({
    where: { id, isActive: true },
    data: { isActive: false, isPublished: false },
  });
  if (count === 0) throw notFound('Product');
}

// ── Categories ──────────────────────────────────────────────────────────────

export async function listCategories(): Promise<CategoryDTO[]> {
  const categories = await prisma.category.findMany({
    orderBy: [{ department: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    department: c.department,
    productCount: c._count.products,
  }));
}

export async function createCategory(input: CategoryInput): Promise<CategoryDTO> {
  const slug = slugify(input.name);
  const clash = await prisma.category.findFirst({
    where: { OR: [{ name: { equals: input.name, mode: 'insensitive' } }, { slug }] },
  });
  if (clash) throw conflict('A category with this name already exists');
  const c = await prisma.category.create({ data: { ...input, slug } });
  return { id: c.id, name: c.name, slug: c.slug, department: c.department, productCount: 0 };
}
