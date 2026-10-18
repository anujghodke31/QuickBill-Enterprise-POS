import { LOYALTY, type Paginated, type ReturnDTO, type returnInputSchema } from '@quickbill/shared';
import type { z } from 'zod';
import { notFound, unprocessable } from '../../lib/errors';
import { nextDocumentNumber } from '../../lib/documents';
import { paginate, paginated } from '../../lib/pagination';
import { prisma, type Prisma } from '../../lib/prisma';
import { applyStockChange } from '../../lib/stock';

type ReturnCreate = z.output<typeof returnInputSchema>;

const returnInclude = {
  sale: { select: { id: true, number: true } },
  processedBy: { select: { id: true, name: true } },
  items: { include: { saleItem: { select: { name: true } } } },
} satisfies Prisma.ReturnInclude;

function toReturnDTO(r: Prisma.ReturnGetPayload<{ include: typeof returnInclude }>): ReturnDTO {
  return {
    id: r.id,
    number: r.number,
    sale: r.sale,
    reason: r.reason,
    refundAmount: r.refundAmount,
    refundMethod: r.refundMethod,
    processedBy: r.processedBy,
    createdAt: r.createdAt.toISOString(),
    items: r.items.map((i) => ({
      productId: i.productId,
      name: i.saleItem.name,
      quantity: i.quantity,
      amount: i.amount,
      restock: i.restock,
    })),
  };
}

export async function createReturn(input: ReturnCreate, userId: string): Promise<ReturnDTO> {
  const created = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: input.saleId },
      include: { items: true },
    });
    if (!sale) throw notFound('Sale');

    // Refunds are pro-rated by the bill-level discount the customer actually received.
    const paidRatio = sale.subtotal === 0 ? 0 : sale.total / sale.subtotal;
    const itemsById = new Map(sale.items.map((i) => [i.id, i]));
    const lines = input.items.map((line) => {
      const saleItem = itemsById.get(line.saleItemId);
      if (!saleItem) throw unprocessable('An item does not belong to this bill');
      const returnable = saleItem.quantity - saleItem.returnedQty;
      if (line.quantity > returnable) {
        throw unprocessable(`Only ${returnable} × ${saleItem.name} can still be returned`);
      }
      return {
        saleItem,
        quantity: line.quantity,
        restock: line.restock,
        amount: Math.round(saleItem.unitPrice * line.quantity * paidRatio),
      };
    });
    const refundAmount = lines.reduce((sum, l) => sum + l.amount, 0);

    const ret = await tx.return.create({
      data: {
        number: await nextDocumentNumber(tx, 'return'),
        saleId: sale.id,
        processedById: userId,
        reason: input.reason,
        refundAmount,
        refundMethod: input.refundMethod,
        items: {
          create: lines.map((l) => ({
            saleItemId: l.saleItem.id,
            productId: l.saleItem.productId,
            quantity: l.quantity,
            amount: l.amount,
            restock: l.restock,
          })),
        },
      },
    });

    for (const line of lines) {
      await tx.saleItem.update({
        where: { id: line.saleItem.id },
        data: { returnedQty: { increment: line.quantity } },
      });
      if (line.restock) {
        await applyStockChange(tx, {
          productId: line.saleItem.productId,
          delta: line.quantity,
          reason: 'RETURN',
          returnId: ret.id,
          userId,
          note: input.reason,
        });
      }
    }

    if (sale.customerId) {
      const customer = await tx.customer.findUniqueOrThrow({ where: { id: sale.customerId } });
      const pointsClawback = Math.min(
        customer.loyaltyPoints,
        Math.floor(refundAmount / LOYALTY.earnPerPaise),
      );
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          totalSpent: { decrement: Math.min(refundAmount, customer.totalSpent) },
          loyaltyPoints: { decrement: pointsClawback },
        },
      });
    }

    return tx.return.findUniqueOrThrow({ where: { id: ret.id }, include: returnInclude });
  });
  return toReturnDTO(created);
}

export async function listReturns(page: number, pageSize: number): Promise<Paginated<ReturnDTO>> {
  const [rows, total] = await Promise.all([
    prisma.return.findMany({
      orderBy: { createdAt: 'desc' },
      include: returnInclude,
      ...paginate(page, pageSize),
    }),
    prisma.return.count(),
  ]);
  return paginated(rows.map(toReturnDTO), total, page, pageSize);
}
