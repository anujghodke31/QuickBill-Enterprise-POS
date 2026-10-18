import {
  gstComponent,
  type Paginated,
  type PurchaseOrderDTO,
  type purchaseOrderInputSchema,
  type PurchaseOrderSource,
  type PurchaseOrderStatus,
} from '@quickbill/shared';
import type { z } from 'zod';
import { notFound, unprocessable } from '../../lib/errors';
import { nextDocumentNumber } from '../../lib/documents';
import { paginate, paginated } from '../../lib/pagination';
import { prisma, type Prisma, type Tx } from '../../lib/prisma';
import { applyStockChange } from '../../lib/stock';

type PurchaseOrderInput = z.output<typeof purchaseOrderInputSchema>;

/** Fields needed to draft a purchase order from code (forecast, bill scan). */
export interface PurchaseOrderDraft {
  supplierId: string;
  items: { productId: string; quantity: number; unitCost: number; taxRate: number }[];
  notes?: string | null;
  supplierInvoiceNo?: string | null;
  invoiceDate?: Date;
}

const poInclude = {
  supplier: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  items: {
    orderBy: { id: 'asc' },
    include: { product: { select: { name: true, sku: true } } },
  },
} satisfies Prisma.PurchaseOrderInclude;

type PurchaseOrderWithItems = Prisma.PurchaseOrderGetPayload<{ include: typeof poInclude }>;

export function toPurchaseOrderDTO(po: PurchaseOrderWithItems): PurchaseOrderDTO {
  return {
    id: po.id,
    number: po.number,
    status: po.status,
    source: po.source,
    supplier: po.supplier,
    items: po.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.product.name,
      sku: i.product.sku,
      quantity: i.quantity,
      unitCost: i.unitCost,
      taxRate: i.taxRate,
      lineTotal: i.lineTotal,
    })),
    subtotal: po.subtotal,
    taxTotal: po.taxTotal,
    total: po.total,
    notes: po.notes,
    supplierInvoiceNo: po.supplierInvoiceNo,
    invoiceDate: po.invoiceDate?.toISOString() ?? null,
    createdBy: po.createdBy,
    createdAt: po.createdAt.toISOString(),
    receivedAt: po.receivedAt?.toISOString() ?? null,
  };
}

/**
 * Creates a purchase order inside an existing transaction. Supplier unit costs
 * are treated as GST-inclusive, matching how retail bills are usually printed.
 */
export async function createPurchaseOrderTx(
  tx: Tx,
  input: PurchaseOrderDraft,
  userId: string,
  source: PurchaseOrderSource = 'MANUAL',
) {
  const supplier = await tx.supplier.findUnique({ where: { id: input.supplierId } });
  if (!supplier) throw notFound('Supplier');
  const productCount = await tx.product.count({
    where: { id: { in: input.items.map((i) => i.productId) } },
  });
  if (productCount !== new Set(input.items.map((i) => i.productId)).size) {
    throw unprocessable('One or more products do not exist');
  }

  const items = input.items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    unitCost: i.unitCost,
    taxRate: i.taxRate,
    lineTotal: i.unitCost * i.quantity,
  }));
  const total = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const taxTotal = items.reduce((sum, i) => sum + gstComponent(i.lineTotal, i.taxRate), 0);

  return tx.purchaseOrder.create({
    data: {
      number: await nextDocumentNumber(tx, 'purchaseOrder'),
      supplierId: supplier.id,
      source,
      notes: input.notes,
      supplierInvoiceNo: input.supplierInvoiceNo,
      invoiceDate: input.invoiceDate,
      subtotal: total - taxTotal,
      taxTotal,
      total,
      createdById: userId,
      items: { create: items },
    },
  });
}

/** Receives goods: adds stock for every line and records the latest unit cost. */
export async function receivePurchaseOrderTx(tx: Tx, id: string, userId: string) {
  const po = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
  if (!po) throw notFound('Purchase order');
  if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
    throw unprocessable(`This purchase order is already ${po.status.toLowerCase()}`);
  }
  for (const item of po.items) {
    await applyStockChange(tx, {
      productId: item.productId,
      delta: item.quantity,
      reason: 'PURCHASE',
      purchaseOrderId: po.id,
      userId,
      note: po.number,
    });
    await tx.product.update({
      where: { id: item.productId },
      data: { costPrice: item.unitCost, supplierId: po.supplierId },
    });
  }
  await tx.purchaseOrder.update({
    where: { id },
    data: { status: 'RECEIVED', receivedAt: new Date() },
  });
}

export async function createPurchaseOrder(
  input: PurchaseOrderInput,
  userId: string,
): Promise<PurchaseOrderDTO> {
  const po = await prisma.$transaction(async (tx) => {
    const created = await createPurchaseOrderTx(tx, input, userId);
    return tx.purchaseOrder.findUniqueOrThrow({ where: { id: created.id }, include: poInclude });
  });
  return toPurchaseOrderDTO(po);
}

export async function setPurchaseOrderStatus(
  id: string,
  status: PurchaseOrderStatus,
  userId: string,
): Promise<PurchaseOrderDTO> {
  const po = await prisma.$transaction(async (tx) => {
    const current = await tx.purchaseOrder.findUnique({ where: { id } });
    if (!current) throw notFound('Purchase order');
    if (status === 'RECEIVED') {
      await receivePurchaseOrderTx(tx, id, userId);
    } else {
      const allowed: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
        DRAFT: ['ORDERED', 'CANCELLED'],
        ORDERED: ['CANCELLED'],
        RECEIVED: [],
        CANCELLED: [],
      };
      if (!allowed[current.status].includes(status)) {
        throw unprocessable(
          `Cannot move a ${current.status.toLowerCase()} order to ${status.toLowerCase()}`,
        );
      }
      await tx.purchaseOrder.update({ where: { id }, data: { status } });
    }
    return tx.purchaseOrder.findUniqueOrThrow({ where: { id }, include: poInclude });
  });
  return toPurchaseOrderDTO(po);
}

export async function listPurchaseOrders(query: {
  status?: PurchaseOrderStatus;
  page: number;
  pageSize: number;
}): Promise<Paginated<PurchaseOrderDTO>> {
  const where: Prisma.PurchaseOrderWhereInput = query.status ? { status: query.status } : {};
  const [rows, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: poInclude,
      ...paginate(query.page, query.pageSize),
    }),
    prisma.purchaseOrder.count({ where }),
  ]);
  return paginated(rows.map(toPurchaseOrderDTO), total, query.page, query.pageSize);
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrderDTO> {
  const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: poInclude });
  if (!po) throw notFound('Purchase order');
  return toPurchaseOrderDTO(po);
}

export { poInclude };
