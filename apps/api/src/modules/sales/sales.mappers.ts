import type { SaleDTO, SaleSummaryDTO } from '@quickbill/shared';
import type { Prisma } from '../../generated/prisma/client';

export const saleInclude = {
  items: { orderBy: { id: 'asc' } },
  customer: { select: { id: true, name: true, phone: true } },
  cashier: { select: { id: true, name: true } },
} satisfies Prisma.SaleInclude;

export const saleSummaryInclude = {
  customer: { select: { name: true } },
  cashier: { select: { name: true } },
  _count: { select: { items: true } },
} satisfies Prisma.SaleInclude;

type SaleWithItems = Prisma.SaleGetPayload<{ include: typeof saleInclude }>;
type SaleWithSummary = Prisma.SaleGetPayload<{ include: typeof saleSummaryInclude }>;

export function toSaleDTO(s: SaleWithItems): SaleDTO {
  return {
    id: s.id,
    number: s.number,
    createdAt: s.createdAt.toISOString(),
    customer: s.customer,
    cashier: s.cashier,
    items: s.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.name,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      taxRate: i.taxRate,
      lineTotal: i.lineTotal,
      returnedQty: i.returnedQty,
    })),
    subtotal: s.subtotal,
    discount: s.discount,
    taxTotal: s.taxTotal,
    total: s.total,
    paymentMethod: s.paymentMethod,
    amountTendered: s.amountTendered,
    changeDue: s.changeDue,
    pointsEarned: s.pointsEarned,
    pointsRedeemed: s.pointsRedeemed,
  };
}

export function toSaleSummaryDTO(s: SaleWithSummary): SaleSummaryDTO {
  return {
    id: s.id,
    number: s.number,
    createdAt: s.createdAt.toISOString(),
    customerName: s.customer?.name ?? null,
    cashierName: s.cashier.name,
    itemCount: s._count.items,
    total: s.total,
    paymentMethod: s.paymentMethod,
  };
}
