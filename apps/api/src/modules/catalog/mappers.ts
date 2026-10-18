import type { ProductDTO, StockLevel, StoreProductDTO } from '@quickbill/shared';
import type { Category, Prisma, Product } from '../../generated/prisma/client';

export const productInclude = {
  category: true,
  supplier: { select: { id: true, name: true } },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Product & {
  category: Category;
  supplier: { id: string; name: string } | null;
};

export function stockLevel(stock: number, reorderPoint: number): StockLevel {
  if (stock <= 0) return 'out';
  if (stock <= reorderPoint) return 'low';
  return 'in';
}

export function toProductDTO(p: ProductWithRelations): ProductDTO {
  return {
    id: p.id,
    sku: p.sku,
    barcode: p.barcode,
    name: p.name,
    slug: p.slug,
    description: p.description,
    brand: p.brand,
    unit: p.unit,
    category: { id: p.category.id, name: p.category.name, slug: p.category.slug },
    supplier: p.supplier,
    price: p.price,
    costPrice: p.costPrice,
    compareAtPrice: p.compareAtPrice,
    taxRate: p.taxRate,
    stock: p.stock,
    reorderPoint: p.reorderPoint,
    imageUrl: p.imageUrl,
    tags: p.tags,
    isPublished: p.isPublished,
    expiryDate: p.expiryDate?.toISOString() ?? null,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function toStoreProductDTO(p: Product & { category: Category }): StoreProductDTO {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    unit: p.unit,
    description: p.description,
    category: { name: p.category.name, slug: p.category.slug, department: p.category.department },
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    imageUrl: p.imageUrl,
    tags: p.tags,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    stockLevel: stockLevel(p.stock, p.reorderPoint),
  };
}
