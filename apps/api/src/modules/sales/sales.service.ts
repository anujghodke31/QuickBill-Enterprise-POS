import {
  computeBillTotals,
  LOYALTY,
  type checkoutSchema,
  type Paginated,
  type PaymentMethod,
  type SaleDTO,
  type SaleSummaryDTO,
} from '@quickbill/shared';
import type { z } from 'zod';
import { notFound, unprocessable } from '../../lib/errors';
import { nextDocumentNumber } from '../../lib/documents';
import { paginate, paginated } from '../../lib/pagination';
import { prisma, type Prisma } from '../../lib/prisma';
import { applyStockChange, normalizeLines } from '../../lib/stock';
import { saleInclude, saleSummaryInclude, toSaleDTO, toSaleSummaryDTO } from './sales.mappers';

type Checkout = z.output<typeof checkoutSchema>;

/** Points that can be redeemed against a bill: limited by balance and by the redemption cap. */
export function redeemablePoints(requested: number, balance: number, subtotal: number): number {
  const capByBill = Math.floor((subtotal * LOYALTY.maxRedeemShare) / LOYALTY.pointValuePaise);
  return Math.max(0, Math.min(requested, balance, capByBill));
}

export function pointsEarnedFor(total: number): number {
  return Math.floor(total / LOYALTY.earnPerPaise);
}

export async function checkout(input: Checkout, cashierId: string): Promise<SaleDTO> {
  if (input.idempotencyKey) {
    const existing = await prisma.sale.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: saleInclude,
    });
    if (existing) return toSaleDTO(existing);
  }

  const lines = normalizeLines(input.items);

  const sale = await prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: lines.map((l) => l.productId) }, isActive: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    const priced = lines.map((line) => {
      const product = byId.get(line.productId);
      if (!product) throw unprocessable('A product in the cart is no longer available');
      return {
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        unitCost: product.costPrice,
        taxRate: product.taxRate,
        quantity: line.quantity,
        lineTotal: product.price * line.quantity,
      };
    });

    const customer = input.customerId
      ? await tx.customer.findUnique({ where: { id: input.customerId } })
      : null;
    if (input.customerId && !customer) throw notFound('Customer');

    const grossSubtotal = priced.reduce((sum, l) => sum + l.lineTotal, 0);
    const pointsRedeemed = customer
      ? redeemablePoints(input.redeemPoints, customer.loyaltyPoints, grossSubtotal)
      : 0;
    if (input.redeemPoints > pointsRedeemed) {
      throw unprocessable(`Only ${pointsRedeemed} points can be redeemed on this bill`);
    }
    const totals = computeBillTotals(priced, pointsRedeemed * LOYALTY.pointValuePaise);

    let amountTendered: number | null = null;
    let changeDue: number | null = null;
    if (input.paymentMethod === 'CASH') {
      amountTendered = input.amountTendered ?? 0;
      if (amountTendered < totals.total) {
        throw unprocessable('Cash received is less than the bill total');
      }
      changeDue = amountTendered - totals.total;
    }

    const pointsEarned = customer ? pointsEarnedFor(totals.total) : 0;

    const created = await tx.sale.create({
      data: {
        number: await nextDocumentNumber(tx, 'sale'),
        idempotencyKey: input.idempotencyKey,
        customerId: customer?.id,
        cashierId,
        subtotal: totals.subtotal,
        discount: totals.discount,
        taxTotal: totals.taxTotal,
        total: totals.total,
        paymentMethod: input.paymentMethod,
        amountTendered,
        changeDue,
        pointsEarned,
        pointsRedeemed,
        items: { create: priced },
      },
    });

    for (const line of priced) {
      await applyStockChange(tx, {
        productId: line.productId,
        delta: -line.quantity,
        reason: 'SALE',
        saleId: created.id,
        userId: cashierId,
      });
    }

    if (customer) {
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          loyaltyPoints: { increment: pointsEarned - pointsRedeemed },
          totalSpent: { increment: totals.total },
          visitCount: { increment: 1 },
          lastVisitAt: new Date(),
        },
      });
    }

    return tx.sale.findUniqueOrThrow({ where: { id: created.id }, include: saleInclude });
  });

  return toSaleDTO(sale);
}

export async function listSales(query: {
  q?: string;
  from?: Date;
  to?: Date;
  paymentMethod?: PaymentMethod;
  page: number;
  pageSize: number;
}): Promise<Paginated<SaleSummaryDTO>> {
  const where: Prisma.SaleWhereInput = {
    ...(query.q
      ? {
          OR: [
            { number: { contains: query.q, mode: 'insensitive' } },
            { customer: { name: { contains: query.q, mode: 'insensitive' } } },
            { customer: { phone: { startsWith: query.q } } },
          ],
        }
      : {}),
    ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: saleSummaryInclude,
      ...paginate(query.page, query.pageSize),
    }),
    prisma.sale.count({ where }),
  ]);
  return paginated(rows.map(toSaleSummaryDTO), total, query.page, query.pageSize);
}

export async function getSale(idOrNumber: string): Promise<SaleDTO> {
  const sale = await prisma.sale.findFirst({
    where: { OR: [{ id: idOrNumber }, { number: idOrNumber.toUpperCase() }] },
    include: saleInclude,
  });
  if (!sale) throw notFound('Sale');
  return toSaleDTO(sale);
}
