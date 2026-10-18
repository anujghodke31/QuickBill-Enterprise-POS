import type { StockReason } from '@quickbill/shared';
import { conflict, notFound } from './errors';
import type { Tx } from './prisma';

export interface StockChange {
  productId: string;
  delta: number;
  reason: StockReason;
  note?: string;
  userId?: string;
  saleId?: string;
  orderId?: string;
  purchaseOrderId?: string;
  returnId?: string;
}

/**
 * The only way stock changes. A single conditional UPDATE both checks and moves
 * stock, so two tills selling the last unit at the same moment cannot both
 * succeed: the row lock makes the second update see the new balance and fail.
 * Every change is written to the StockMovement ledger.
 */
export async function applyStockChange(tx: Tx, change: StockChange): Promise<number> {
  const rows = await tx.$queryRaw<{ stock: number }[]>`
    UPDATE "Product"
    SET stock = stock + ${change.delta}, "updatedAt" = now()
    WHERE id = ${change.productId} AND stock + ${change.delta} >= 0
    RETURNING stock`;

  const balance = rows[0]?.stock;
  if (balance === undefined) {
    const product = await tx.product.findUnique({
      where: { id: change.productId },
      select: { name: true, stock: true },
    });
    if (!product) throw notFound('Product');
    throw conflict(`Only ${product.stock} × ${product.name} left in stock`, {
      productId: change.productId,
      available: product.stock,
    });
  }

  await tx.stockMovement.create({
    data: {
      productId: change.productId,
      delta: change.delta,
      reason: change.reason,
      balanceAfter: balance,
      note: change.note,
      userId: change.userId,
      saleId: change.saleId,
      orderId: change.orderId,
      purchaseOrderId: change.purchaseOrderId,
      returnId: change.returnId,
    },
  });
  return balance;
}

/** Merges duplicate cart lines and sorts by product id so row locks are always taken in the same order. */
export function normalizeLines<T extends { productId: string; quantity: number }>(lines: T[]) {
  const merged = new Map<string, number>();
  for (const line of lines) {
    merged.set(line.productId, (merged.get(line.productId) ?? 0) + line.quantity);
  }
  return [...merged.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([productId, quantity]) => ({ productId, quantity }));
}
