import type {
  Paginated,
  StockAdjustmentInput,
  StockMovementDTO,
  StockReason,
} from '@quickbill/shared';
import { paginate, paginated } from '../../lib/pagination';
import { prisma, type Prisma } from '../../lib/prisma';
import { applyStockChange } from '../../lib/stock';
import { productInclude, toProductDTO } from '../catalog/mappers';
import { expiryCutoff } from '../catalog/products.service';

export async function adjustStock(input: StockAdjustmentInput, userId: string) {
  const product = await prisma.$transaction(async (tx) => {
    await applyStockChange(tx, {
      productId: input.productId,
      delta: input.delta,
      reason: 'ADJUSTMENT',
      note: input.note,
      userId,
    });
    return tx.product.findUniqueOrThrow({
      where: { id: input.productId },
      include: productInclude,
    });
  });
  return toProductDTO(product);
}

export async function listMovements(query: {
  productId?: string;
  reason?: StockReason;
  page: number;
  pageSize: number;
}): Promise<Paginated<StockMovementDTO>> {
  const where: Prisma.StockMovementWhereInput = {
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.reason ? { reason: query.reason } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        user: { select: { id: true, name: true } },
      },
      ...paginate(query.page, query.pageSize),
    }),
    prisma.stockMovement.count({ where }),
  ]);
  return paginated(
    rows.map((m) => ({
      id: m.id,
      product: m.product,
      delta: m.delta,
      reason: m.reason,
      balanceAfter: m.balanceAfter,
      note: m.note,
      user: m.user,
      createdAt: m.createdAt.toISOString(),
    })),
    total,
    query.page,
    query.pageSize,
  );
}

export async function getAlerts() {
  const lowWhere = { isActive: true, stock: { lte: prisma.product.fields.reorderPoint } };
  const expiringWhere = {
    isActive: true,
    stock: { gt: 0 },
    expiryDate: { not: null, lte: expiryCutoff() },
  };
  const [lowStock, expiring, lowStockTotal, expiringTotal] = await Promise.all([
    prisma.product.findMany({
      where: lowWhere,
      orderBy: { stock: 'asc' },
      select: { id: true, name: true, sku: true, stock: true, reorderPoint: true },
      take: 50,
    }),
    prisma.product.findMany({
      where: expiringWhere,
      orderBy: { expiryDate: 'asc' },
      select: { id: true, name: true, sku: true, stock: true, expiryDate: true },
      take: 50,
    }),
    prisma.product.count({ where: lowWhere }),
    prisma.product.count({ where: expiringWhere }),
  ]);
  return {
    lowStockTotal,
    expiringTotal,
    lowStock,
    expiring: expiring.map((p) => ({
      ...p,
      expiryDate: p.expiryDate!.toISOString(),
      expired: p.expiryDate! <= new Date(),
    })),
  };
}
