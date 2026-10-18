import {
  computeBillTotals,
  ORDER_TRANSITIONS,
  SHIPPING,
  type OrderDTO,
  type OrderStatus,
  type Paginated,
  type placeOrderSchema,
  type ShippingAddress,
} from '@quickbill/shared';
import type { z } from 'zod';
import { notFound, unprocessable } from '../../lib/errors';
import { nextDocumentNumber } from '../../lib/documents';
import { paginate, paginated } from '../../lib/pagination';
import { prisma, type Prisma, type Tx } from '../../lib/prisma';
import { applyStockChange, normalizeLines } from '../../lib/stock';

type PlaceOrder = z.output<typeof placeOrderSchema>;

const orderInclude = {
  items: {
    orderBy: { id: 'asc' },
    include: {
      product: {
        select: {
          slug: true,
          imageUrl: true,
          brand: true,
          unit: true,
          category: { select: { name: true, department: true } },
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

function toOrderDTO(o: OrderWithItems): OrderDTO {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    contact: { name: o.contactName, email: o.contactEmail, phone: o.contactPhone },
    shippingAddress: o.shippingAddress as ShippingAddress,
    items: o.items.map((i) => ({
      productId: i.productId,
      name: i.name,
      slug: i.product.slug,
      imageUrl: i.product.imageUrl,
      brand: i.product.brand,
      unit: i.product.unit,
      category: i.product.category.name,
      department: i.product.category.department,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
    })),
    subtotal: o.subtotal,
    shippingFee: o.shippingFee,
    taxTotal: o.taxTotal,
    total: o.total,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

export function shippingFeeFor(subtotal: number): number {
  return subtotal >= SHIPPING.freeAbovePaise ? 0 : SHIPPING.flatFeePaise;
}

/** Finds or creates the CRM record for a shopper so online and in-store history line up. */
async function resolveCustomer(tx: Tx, input: PlaceOrder, userId?: string) {
  if (userId) {
    const linked = await tx.customer.findUnique({ where: { userId } });
    if (linked) return linked;
  }
  const existing = await tx.customer.findFirst({
    where: { OR: [{ email: input.contact.email }, { phone: input.contact.phone }] },
  });
  if (existing) return existing;
  return tx.customer.create({
    data: {
      name: input.contact.name,
      email: input.contact.email,
      phone: input.contact.phone,
      userId,
    },
  });
}

export async function placeOrder(input: PlaceOrder, userId?: string): Promise<OrderDTO> {
  const lines = normalizeLines(input.items);
  const order = await prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: lines.map((l) => l.productId) }, isActive: true, isPublished: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    const priced = lines.map((line) => {
      const product = byId.get(line.productId);
      if (!product) throw unprocessable('An item in your cart is no longer available');
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

    const totals = computeBillTotals(priced);
    const shippingFee = shippingFeeFor(totals.subtotal);
    const customer = await resolveCustomer(tx, input, userId);
    // Online payment is simulated: a real deployment would confirm it from the gateway webhook.
    const paidOnline = input.paymentMethod === 'ONLINE';

    const created = await tx.order.create({
      data: {
        number: await nextDocumentNumber(tx, 'order'),
        userId,
        customerId: customer.id,
        contactName: input.contact.name,
        contactEmail: input.contact.email,
        contactPhone: input.contact.phone,
        shippingAddress: input.shippingAddress,
        paymentMethod: input.paymentMethod,
        paymentStatus: paidOnline ? 'PAID' : 'PENDING',
        status: paidOnline ? 'CONFIRMED' : 'PENDING',
        subtotal: totals.subtotal,
        shippingFee,
        taxTotal: totals.taxTotal,
        total: totals.total + shippingFee,
        items: { create: priced },
      },
    });

    // Stock is reserved when the order is placed and released if it is cancelled.
    for (const line of priced) {
      await applyStockChange(tx, {
        productId: line.productId,
        delta: -line.quantity,
        reason: 'ONLINE_ORDER',
        orderId: created.id,
      });
    }

    await tx.customer.update({
      where: { id: customer.id },
      data: { totalSpent: { increment: created.total }, lastVisitAt: new Date() },
    });

    return tx.order.findUniqueOrThrow({ where: { id: created.id }, include: orderInclude });
  });
  return toOrderDTO(order);
}

/** Guest order lookup needs both the order number and the email used to place it. */
export async function lookupOrder(number: string, email: string): Promise<OrderDTO> {
  const order = await prisma.order.findFirst({
    where: { number: number.toUpperCase(), contactEmail: email },
    include: orderInclude,
  });
  if (!order) throw notFound('Order');
  return toOrderDTO(order);
}

export async function getOrderForUser(id: string, userId: string): Promise<OrderDTO> {
  const order = await prisma.order.findFirst({ where: { id, userId }, include: orderInclude });
  if (!order) throw notFound('Order');
  return toOrderDTO(order);
}

export async function listOrdersForUser(userId: string): Promise<OrderDTO[]> {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: orderInclude,
    take: 50,
  });
  return orders.map(toOrderDTO);
}

export async function listOrders(query: {
  status?: OrderStatus;
  q?: string;
  page: number;
  pageSize: number;
}): Promise<Paginated<OrderDTO>> {
  const where: Prisma.OrderWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.q
      ? {
          OR: [
            { number: { contains: query.q, mode: 'insensitive' } },
            { contactName: { contains: query.q, mode: 'insensitive' } },
            { contactEmail: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: orderInclude,
      ...paginate(query.page, query.pageSize),
    }),
    prisma.order.count({ where }),
  ]);
  return paginated(rows.map(toOrderDTO), total, query.page, query.pageSize);
}

export async function getOrder(id: string): Promise<OrderDTO> {
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!order) throw notFound('Order');
  return toOrderDTO(order);
}

export async function updateOrderStatus(
  id: string,
  next: OrderStatus,
  userId: string,
): Promise<OrderDTO> {
  const order = await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!current) throw notFound('Order');
    if (!ORDER_TRANSITIONS[current.status].includes(next)) {
      throw unprocessable(
        `An order that is ${current.status.toLowerCase()} cannot be ${next.toLowerCase()}`,
      );
    }

    const data: Prisma.OrderUpdateInput = { status: next };
    if (next === 'CANCELLED') {
      for (const item of current.items) {
        await applyStockChange(tx, {
          productId: item.productId,
          delta: item.quantity,
          reason: 'ORDER_CANCEL',
          orderId: current.id,
          userId,
        });
      }
      if (current.paymentStatus === 'PAID') data.paymentStatus = 'REFUNDED';
      if (current.customerId) {
        await tx.customer.update({
          where: { id: current.customerId },
          data: { totalSpent: { decrement: current.total } },
        });
      }
    }
    if (next === 'DELIVERED' && current.paymentMethod === 'COD') data.paymentStatus = 'PAID';

    await tx.order.update({ where: { id }, data });
    return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
  });
  return toOrderDTO(order);
}
