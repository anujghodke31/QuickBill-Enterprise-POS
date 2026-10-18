/**
 * Seeds QuickBill with a realistic store: catalog, suppliers, customers, staff and
 * ~90 days of simulated trading (in-store bills, online orders, restocking,
 * returns and loyalty) so analytics, forecasting and recommendations have real
 * signal to work with. Deterministic: the same seed always produces the same data.
 *
 *   npm run db:seed
 */
import { randomUUID } from 'node:crypto';
import { computeBillTotals, LOYALTY, SHIPPING } from '@quickbill/shared';
import { STORE } from '../src/config/store';
import { addDays, localDate, startOfLocalDay } from '../src/lib/dates';
import { prisma, type Prisma } from '../src/lib/prisma';
import { slugify } from '../src/lib/text';
import { embeddingsAvailable, embedProducts } from '../src/modules/ai/embeddings';
import { hashPassword } from '../src/modules/auth/auth.service';
import { CATALOG, PAIRS, SUPPLIERS, type CatalogItem, type Role } from './seed/catalog';
import {
  BUILDINGS,
  FIRST_NAMES,
  LAST_NAMES,
  PINCODES,
  RETURN_REASONS,
  STREETS,
} from './seed/people';

const DAYS = 90;
const DEMO_PASSWORD = 'Demo@1234';
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// ── Deterministic randomness ────────────────────────────────────────────────

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261018);
const chance = (p: number) => rand() < p;
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
const between = (min: number, max: number) => min + rand() * (max - min);
const int = (min: number, max: number) => Math.floor(between(min, max + 1));
function gaussian() {
  const u = 1 - rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function poisson(lambda: number) {
  if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * gaussian()));
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > limit);
  return k - 1;
}
function weightedPicker<T>(items: T[], weight: (t: T) => number) {
  const cumulative: number[] = [];
  let total = 0;
  for (const item of items) {
    total += Math.max(0, weight(item));
    cumulative.push(total);
  }
  return () => {
    if (total === 0) return null;
    const r = rand() * total;
    let lo = 0;
    let hi = cumulative.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid]! < r) lo = mid + 1;
      else hi = mid;
    }
    return items[lo]!;
  };
}

function ean13(seq: number): string {
  const body = `890${String(1_000_000 + seq * 7919)
    .padStart(9, '0')
    .slice(-9)}`;
  const sum = [...body].reduce((s, d, i) => s + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return body + ((10 - (sum % 10)) % 10);
}

const docNumber = (prefix: string, seq: number, at: Date) =>
  `${prefix}-${String(at.getFullYear()).slice(-2)}-${String(seq).padStart(6, '0')}`;

// ── Types for the in-memory simulation ──────────────────────────────────────

interface SimProduct {
  id: string;
  name: string;
  item: CatalogItem;
  categoryId: string;
  supplierId: string;
  leadTime: number;
  price: number;
  costPrice: number;
  stock: number;
  reorderPoint: number;
  target: number;
  createdAt: Date;
  lastReceivedAt: Date;
  onOrder: boolean;
  troubled: boolean;
  soldToday: number;
  /** Units sold per day, most recent last. */
  dailySales: number[];
}

interface SimCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  weight: number;
  createdAt: Date;
  userId: string | null;
  points: number;
  totalSpent: number;
  visits: number;
  lastVisitAt: Date | null;
}

async function main() {
  const started = Date.now();
  console.log('Resetting database…');
  await prisma.$executeRawUnsafe(`
    TRUNCATE "AiConversation", "BillScan", "ReturnItem", "Return", "SaleItem", "Sale",
      "OrderItem", "Order", "PurchaseOrderItem", "PurchaseOrder", "StockMovement", "Product",
      "Category", "Supplier", "Customer", "RefreshToken", "User", "Counter" CASCADE`);

  // ── Staff and demo accounts ───────────────────────────────────────────────
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const mkUser = (
    name: string,
    email: string,
    role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'CUSTOMER',
  ) =>
    prisma.user.create({
      data: { name, email, role, passwordHash, createdAt: new Date(Date.now() - 400 * DAY) },
    });
  const admin = await mkUser('Aditi Rao', 'admin@quickbill.dev', 'ADMIN');
  await mkUser('Vikram Desai', 'manager@quickbill.dev', 'MANAGER');
  const priya = await mkUser('Priya Sharma', 'priya@quickbill.dev', 'CASHIER');
  const rahul = await mkUser('Rahul Patil', 'rahul@quickbill.dev', 'CASHIER');
  const sneha = await mkUser('Sneha Kulkarni', 'sneha@quickbill.dev', 'CASHIER');
  const shopper = await mkUser('Rohan Kapoor', 'shopper@quickbill.dev', 'CUSTOMER');

  // ── Suppliers, categories, products ───────────────────────────────────────
  const suppliers = new Map<string, { id: string; leadTimeDays: number }>();
  for (const s of SUPPLIERS) {
    const { key, ...data } = s;
    const created = await prisma.supplier.create({ data });
    suppliers.set(key, { id: created.id, leadTimeDays: created.leadTimeDays });
  }

  const now = new Date();
  const today = localDate(now);
  const firstDay = addDays(today, -(DAYS - 1));
  const simStart = new Date(startOfLocalDay(firstDay).getTime() + 7 * HOUR);

  const products: SimProduct[] = [];
  const productRows: Prisma.ProductCreateManyInput[] = [];
  let seq = 0;
  for (const [categoryName, cat] of Object.entries(CATALOG)) {
    const category = await prisma.category.create({
      data: { name: categoryName, slug: slugify(categoryName), department: cat.department },
    });
    const supplier = suppliers.get(cat.supplier)!;
    const code = slugify(categoryName).replace(/-/g, '').slice(0, 3).toUpperCase();
    cat.items.forEach((item, i) => {
      seq++;
      const price = Math.round((item.price ?? item.mrp) * 100);
      // A handful of products are recent additions with a short sales history.
      const isNew = seq % 23 === 7;
      const createdAt = isNew
        ? new Date(now.getTime() - int(4, 12) * DAY)
        : new Date(simStart.getTime() - int(30, 200) * DAY);
      const reorderPoint = Math.max(3, Math.ceil(item.pop * supplier.leadTimeDays * 1.6) + 2);
      const p: SimProduct = {
        id: randomUUID(),
        name: item.name,
        item,
        categoryId: category.id,
        supplierId: supplier.id,
        leadTime: supplier.leadTimeDays,
        price,
        costPrice: Math.round(price * cat.costRatio * between(0.97, 1.03)),
        stock: 0,
        reorderPoint,
        target: Math.ceil(item.pop * (supplier.leadTimeDays + 9)) + reorderPoint,
        createdAt,
        lastReceivedAt: createdAt,
        onOrder: false,
        troubled: false,
        soldToday: 0,
        dailySales: [],
      };
      // Slow movers are over-bought: they show up as overstock and dead stock.
      if (item.pop < 0.2) p.target = int(28, 40);
      products.push(p);
      productRows.push({
        id: p.id,
        sku: `QB-${code}${String(i + 1).padStart(3, '0')}`,
        barcode: ean13(seq),
        name: item.name,
        slug: slugify(`${item.name} ${item.unit}`),
        description:
          item.desc ??
          `${item.name} (${item.unit}) from ${item.brand}. ${cat.blurb} Popular for ${item.tags.slice(0, 3).join(', ')}.`,
        brand: item.brand,
        unit: item.unit,
        categoryId: category.id,
        supplierId: supplier.id,
        price,
        costPrice: p.costPrice,
        compareAtPrice: item.price ? Math.round(item.mrp * 100) : null,
        taxRate: item.gst,
        stock: 0,
        reorderPoint,
        tags: item.tags,
        isPublished: true,
        ratingAvg: Number(between(3.7, 4.8).toFixed(1)),
        ratingCount: Math.round(item.pop * int(15, 40) + int(3, 25)),
        createdAt,
      });
    });
  }

  // Ten fast movers whose supplier "delays" deliveries over the last 9 days, so
  // the forecast has real stock-out risks to flag.
  const fastMovers = products.filter((p) => p.item.pop >= 2 && p.item.pop <= 12);
  for (let i = 0; i < 10; i++) pick(fastMovers).troubled = true;

  // ── Customers ─────────────────────────────────────────────────────────────
  const customers: SimCustomer[] = [];
  const usedPhones = new Set<string>();
  const usedEmails = new Set<string>();
  for (let i = 0; i < 230; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    let phone: string;
    do phone = `${pick(['9', '8', '7'])}${String(int(100_000_000, 999_999_999))}`;
    while (usedPhones.has(phone));
    usedPhones.add(phone);
    let email: string | null = null;
    if (chance(0.55)) {
      email =
        `${first}.${last}${int(1, 99)}`.toLowerCase().replace(/[^a-z0-9.]/g, '') + '@example.com';
      if (usedEmails.has(email)) email = null;
      else usedEmails.add(email);
    }
    customers.push({
      id: randomUUID(),
      name: `${first} ${last}`,
      phone,
      email,
      weight: Math.exp(gaussian() * 0.9),
      createdAt: new Date(simStart.getTime() - int(-80, 300) * DAY),
      userId: null,
      points: 0,
      totalSpent: 0,
      visits: 0,
      lastVisitAt: null,
    });
  }
  const rohan: SimCustomer = {
    id: randomUUID(),
    name: shopper.name,
    phone: '9876543210',
    email: shopper.email,
    weight: 2.5,
    createdAt: new Date(simStart.getTime() - 60 * DAY),
    userId: shopper.id,
    points: 0,
    totalSpent: 0,
    visits: 0,
    lastVisitAt: null,
  };
  customers.push(rohan);

  // ── Records produced by the simulation ────────────────────────────────────
  const sales: Prisma.SaleCreateManyInput[] = [];
  const saleItems: Prisma.SaleItemCreateManyInput[] = [];
  const orders: Prisma.OrderCreateManyInput[] = [];
  const orderItems: Prisma.OrderItemCreateManyInput[] = [];
  const purchaseOrders: Prisma.PurchaseOrderCreateManyInput[] = [];
  const poItems: Prisma.PurchaseOrderItemCreateManyInput[] = [];
  const returns: Prisma.ReturnCreateManyInput[] = [];
  const returnItems: Prisma.ReturnItemCreateManyInput[] = [];
  const movements: Prisma.StockMovementCreateManyInput[] = [];
  const counters = { sale: 0, order: 0, purchaseOrder: 0, return: 0 };

  const move = (
    p: SimProduct,
    delta: number,
    reason: 'INITIAL' | 'SALE' | 'RETURN' | 'PURCHASE' | 'ONLINE_ORDER' | 'ORDER_CANCEL',
    at: Date,
    refs: {
      saleId?: string;
      orderId?: string;
      purchaseOrderId?: string;
      returnId?: string;
      userId?: string;
      note?: string;
    } = {},
  ) => {
    p.stock += delta;
    if (reason === 'SALE' || reason === 'ONLINE_ORDER') p.soldToday -= delta;
    movements.push({
      id: randomUUID(),
      productId: p.id,
      delta,
      reason,
      balanceAfter: p.stock,
      createdAt: at,
      ...refs,
    });
  };

  // Opening stock.
  for (const p of products) {
    const at = p.createdAt > simStart ? p.createdAt : simStart;
    move(p, Math.max(4, Math.round(p.target * between(0.8, 1.2))), 'INITIAL', at, {
      note: 'Opening stock',
      userId: admin.id,
    });
    p.lastReceivedAt = at;
  }

  const byRole = new Map<Role, SimProduct[]>();
  for (const p of products) {
    if (p.item.role) byRole.set(p.item.role, [...(byRole.get(p.item.role) ?? []), p]);
  }

  const openPOs: { id: string; dueAt: Date; items: { p: SimProduct; qty: number }[] }[] = [];
  const pendingReturns: {
    at: Date;
    saleId: string;
    item: { id: string; p: SimProduct; unitPrice: number; ratio: number };
    customer: SimCustomer | null;
    method: 'CASH' | 'CARD' | 'UPI';
  }[] = [];

  const WEEKDAY = [1.35, 0.9, 0.85, 0.9, 0.95, 1.05, 1.3]; // Sun..Sat
  const HOURS = [0.4, 0.8, 1.2, 1.3, 1.0, 0.7, 0.6, 0.6, 0.8, 1.1, 1.5, 1.7, 1.5, 0.9]; // 08:00–21:00
  const hourPicker = weightedPicker(
    HOURS.map((w, i) => ({ hour: 8 + i, w })),
    (h) => h.w,
  );

  function seasonalWeight(p: SimProduct, dayIndex: number, at: Date) {
    if (at < p.createdAt) return 0;
    let w = p.item.pop;
    const festiveRamp = Math.max(0, (dayIndex - (DAYS - 15)) / 14); // last two weeks
    const ganesh = dayIndex >= 52 && dayIndex <= 60;
    if (p.item.role === 'festive' || p.item.tags.includes('festival sweets')) {
      w *= 1 + (ganesh ? 1.5 : 0) + festiveRamp * 2.5;
    }
    if (p.item.role === 'ghee') w *= 1 + festiveRamp * 0.8;
    if (p.item.tags.includes('monsoon')) w *= dayIndex < 70 ? 1.6 : 0.9;
    if (p.item.role === 'fever') w *= dayIndex < 70 ? 1.3 : 1;
    if (p.item.tags.includes('summer drink')) w *= 0.6;
    return w;
  }

  function buildBasket(
    picker: () => SimProduct | null,
    lines: number,
    maxQty: number,
  ): Map<SimProduct, number> {
    const basket = new Map<SimProduct, number>();
    let guard = 0;
    while (basket.size < lines && guard++ < lines * 4) {
      const anchor = picker();
      if (!anchor) break;
      const qty =
        anchor.item.pop >= 10 ? int(1, Math.min(3, maxQty)) : chance(0.82) ? 1 : int(2, maxQty);
      basket.set(anchor, (basket.get(anchor) ?? 0) + qty);
      const pairs = anchor.item.role ? PAIRS[anchor.item.role] : undefined;
      if (pairs && chance(0.5)) {
        const partner = pick(byRole.get(pick(pairs)) ?? []);
        if (partner && partner !== anchor) basket.set(partner, (basket.get(partner) ?? 0) + 1);
      }
    }
    return basket;
  }

  /** Takes what stock allows; returns priced lines. */
  function fulfil(basket: Map<SimProduct, number>, at: Date) {
    const lines: { p: SimProduct; quantity: number }[] = [];
    for (const [p, wanted] of basket) {
      if (at < p.createdAt) continue;
      const quantity = Math.min(wanted, p.stock);
      if (quantity > 0) lines.push({ p, quantity });
    }
    return lines;
  }

  function tendered(total: number) {
    const rupees = total / 100;
    if (chance(0.25)) return Math.ceil(rupees) * 100;
    const step = rupees < 100 ? pick([10, 50, 100]) : rupees < 500 ? pick([100, 500]) : 500;
    return Math.ceil(rupees / step) * step * 100;
  }

  // ── Day-by-day simulation ─────────────────────────────────────────────────
  for (let d = 0; d < DAYS; d++) {
    const date = addDays(firstDay, d);
    const dayStart = startOfLocalDay(date);
    const at = (hour: number, minute = 0) =>
      new Date(dayStart.getTime() + hour * HOUR + minute * 60_000);
    const isToday = date === today;
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const dayOfMonth = Number(date.slice(8));
    const festiveRamp = Math.max(0, (d - (DAYS - 15)) / 14);

    // Morning deliveries.
    for (const po of openPOs.filter((x) => x.dueAt <= at(9, 30))) {
      const receivedAt = at(9, int(0, 30));
      if (receivedAt > now) continue;
      for (const { p, qty } of po.items) {
        move(p, qty, 'PURCHASE', receivedAt, { purchaseOrderId: po.id, userId: admin.id });
        p.lastReceivedAt = receivedAt;
        p.onOrder = false;
      }
      const row = purchaseOrders.find((r) => r.id === po.id)!;
      row.status = 'RECEIVED';
      row.receivedAt = receivedAt;
      openPOs.splice(openPOs.indexOf(po), 1);
    }

    // Returns that come back today.
    for (const r of pendingReturns.filter((x) => localDate(x.at) === date && x.at <= now)) {
      const restock = chance(0.7);
      const amount = Math.round(r.item.unitPrice * r.item.ratio);
      const returnId = randomUUID();
      counters.return++;
      returns.push({
        id: returnId,
        number: docNumber('R', counters.return, r.at),
        saleId: r.saleId,
        processedById: pick([priya.id, rahul.id]),
        reason: pick(RETURN_REASONS),
        refundAmount: amount,
        refundMethod: r.method,
        createdAt: r.at,
      });
      returnItems.push({
        id: randomUUID(),
        returnId,
        saleItemId: r.item.id,
        productId: r.item.p.id,
        quantity: 1,
        amount,
        restock,
      });
      const saleItem = saleItems.find((s) => s.id === r.item.id)!;
      saleItem.returnedQty = (saleItem.returnedQty ?? 0) + 1;
      if (restock) move(r.item.p, 1, 'RETURN', r.at, { returnId, userId: rahul.id });
      if (r.customer) {
        r.customer.totalSpent = Math.max(0, r.customer.totalSpent - amount);
        r.customer.points = Math.max(
          0,
          r.customer.points - Math.floor(amount / LOYALTY.earnPerPaise),
        );
      }
    }

    const dayFactor =
      WEEKDAY[weekday]! *
      (1 + 0.12 * (d / DAYS)) *
      (dayOfMonth <= 5 ? 1.08 : 1) *
      (1 + 0.12 * festiveRamp) *
      Math.max(0.75, 1 + gaussian() * 0.07);
    const middayAt = at(13);
    const productPicker = weightedPicker(products, (p) => seasonalWeight(p, d, middayAt));
    const customerPicker = weightedPicker(customers, (c) =>
      c.createdAt <= middayAt ? c.weight : 0,
    );
    const onlineCustomerPicker = weightedPicker(customers, (c) =>
      c.email && c.createdAt <= middayAt ? c.weight : 0,
    );

    type Event = { at: Date; run: () => void };
    const events: Event[] = [];

    // In-store bills.
    const bills = poisson(150 * dayFactor);
    for (let b = 0; b < bills; b++) {
      const hour = hourPicker()!.hour;
      const when = at(hour, int(0, 59));
      if (when > now) continue;
      events.push({
        at: when,
        run: () => {
          const lineCount = Math.min(10, 1 + Math.floor(Math.log(1 - rand()) / Math.log(0.67)));
          const lines = fulfil(buildBasket(productPicker, lineCount, 3), when);
          if (lines.length === 0) return;
          const customer = chance(0.62) ? customerPicker() : null;
          const priced = lines.map((l) => ({
            unitPrice: l.p.price,
            quantity: l.quantity,
            taxRate: l.p.item.gst,
          }));
          const gross = priced.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
          let redeem = 0;
          if (customer && customer.points >= 100 && chance(0.15)) {
            redeem = Math.min(
              customer.points,
              Math.floor((gross * LOYALTY.maxRedeemShare) / LOYALTY.pointValuePaise),
            );
          }
          const totals = computeBillTotals(priced, redeem * LOYALTY.pointValuePaise);
          const method =
            gross > 150_000 && chance(0.4)
              ? 'CARD'
              : chance(0.55)
                ? 'UPI'
                : chance(0.67)
                  ? 'CASH'
                  : 'CARD';
          const cashier =
            (weekday === 0 || weekday === 6) && chance(0.4) ? sneha : hour < 15 ? priya : rahul;
          const pointsEarned = customer ? Math.floor(totals.total / LOYALTY.earnPerPaise) : 0;
          const saleId = randomUUID();
          counters.sale++;
          const amountTendered = method === 'CASH' ? tendered(totals.total) : null;
          sales.push({
            id: saleId,
            number: docNumber('S', counters.sale, when),
            customerId: customer?.id ?? null,
            cashierId: cashier.id,
            subtotal: totals.subtotal,
            discount: totals.discount,
            taxTotal: totals.taxTotal,
            total: totals.total,
            paymentMethod: method,
            amountTendered,
            changeDue: amountTendered === null ? null : amountTendered - totals.total,
            pointsEarned,
            pointsRedeemed: redeem,
            createdAt: when,
          });
          const ratio = totals.subtotal ? totals.total / totals.subtotal : 1;
          for (const l of lines) {
            const itemId = randomUUID();
            saleItems.push({
              id: itemId,
              saleId,
              productId: l.p.id,
              name: l.p.name,
              unitPrice: l.p.price,
              unitCost: l.p.costPrice,
              quantity: l.quantity,
              taxRate: l.p.item.gst,
              lineTotal: l.p.price * l.quantity,
              returnedQty: 0,
            });
            move(l.p, -l.quantity, 'SALE', when, { saleId, userId: cashier.id });
            if (chance(0.0025)) {
              pendingReturns.push({
                at: new Date(when.getTime() + int(1, 3) * DAY + int(-3, 3) * HOUR),
                saleId,
                item: { id: itemId, p: l.p, unitPrice: l.p.price, ratio },
                customer,
                method,
              });
            }
          }
          if (customer) {
            customer.points += pointsEarned - redeem;
            customer.totalSpent += totals.total;
            customer.visits += 1;
            customer.lastVisitAt = when;
          }
        },
      });
    }

    // Online orders.
    const onlineCount = poisson(
      9 * (weekday === 0 || weekday === 6 ? 1.2 : 1) * (1 + 0.25 * (d / DAYS)),
    );
    const forceRohan = d % 13 === 5;
    for (let o = 0; o < onlineCount + (forceRohan ? 1 : 0); o++) {
      const when = at(int(9, 22), int(0, 59));
      if (when > now) continue;
      const isRohan = forceRohan && o === onlineCount;
      events.push({
        at: when,
        run: () => {
          const customer = isRohan ? rohan : onlineCustomerPicker();
          if (!customer?.email) return;
          const lines = fulfil(buildBasket(productPicker, int(3, 9), 2), when);
          if (lines.length === 0) return;
          const priced = lines.map((l) => ({
            unitPrice: l.p.price,
            quantity: l.quantity,
            taxRate: l.p.item.gst,
          }));
          const totals = computeBillTotals(priced);
          const shippingFee =
            totals.subtotal >= SHIPPING.freeAbovePaise ? 0 : SHIPPING.flatFeePaise;
          const ageHours = (now.getTime() - when.getTime()) / HOUR;
          const online = chance(0.6);
          const cancelled = ageHours > 30 && chance(0.06);
          const status = cancelled
            ? 'CANCELLED'
            : ageHours < 4
              ? online
                ? 'CONFIRMED'
                : 'PENDING'
              : ageHours < 20
                ? pick(['CONFIRMED', 'PACKED'] as const)
                : ageHours < 60
                  ? 'SHIPPED'
                  : 'DELIVERED';
          const paymentStatus = cancelled
            ? online
              ? 'REFUNDED'
              : 'PENDING'
            : online || status === 'DELIVERED'
              ? 'PAID'
              : 'PENDING';
          const orderId = randomUUID();
          counters.order++;
          orders.push({
            id: orderId,
            number: docNumber('QB', counters.order, when),
            userId: customer.userId,
            customerId: customer.id,
            contactName: customer.name,
            contactEmail: customer.email,
            contactPhone: customer.phone,
            shippingAddress: {
              line1: `Flat ${int(1, 30)}${pick(['01', '02', '03', '04'])}, ${pick(BUILDINGS)}`,
              line2: pick(STREETS),
              city: 'Pune',
              state: 'Maharashtra',
              pincode: pick(PINCODES),
            },
            status,
            paymentMethod: online ? 'ONLINE' : 'COD',
            paymentStatus,
            subtotal: totals.subtotal,
            shippingFee,
            taxTotal: totals.taxTotal,
            total: totals.total + shippingFee,
            createdAt: when,
            updatedAt: new Date(
              Math.min(now.getTime(), when.getTime() + Math.min(ageHours, 48) * HOUR),
            ),
          });
          for (const l of lines) {
            orderItems.push({
              id: randomUUID(),
              orderId,
              productId: l.p.id,
              name: l.p.name,
              unitPrice: l.p.price,
              unitCost: l.p.costPrice,
              quantity: l.quantity,
              taxRate: l.p.item.gst,
              lineTotal: l.p.price * l.quantity,
            });
            move(l.p, -l.quantity, 'ONLINE_ORDER', when, { orderId });
          }
          if (cancelled) {
            const cancelAt = new Date(when.getTime() + int(1, 5) * HOUR);
            for (const l of lines)
              move(l.p, l.quantity, 'ORDER_CANCEL', cancelAt, { orderId, userId: admin.id });
          } else {
            customer.totalSpent += totals.total + shippingFee;
            customer.lastVisitAt = when;
          }
        },
      });
    }

    // End-of-day reorder check, one purchase order per supplier.
    const reorderAt = at(21, 50);
    if (reorderAt <= now) {
      events.push({
        at: reorderAt,
        run: () => {
          // Weekly, the manager re-tunes reorder levels from the last two weeks of sales.
          if (d % 7 === 6) {
            for (const p of products) {
              const recent = p.dailySales.slice(-14);
              if (recent.length < 7) continue;
              const daily = recent.reduce((s, u) => s + u, 0) / recent.length;
              if (daily < 0.2) continue;
              p.reorderPoint = Math.max(3, Math.ceil(daily * p.leadTime * 1.5) + 2);
              p.target =
                Math.ceil(daily * (p.leadTime + (p.leadTime <= 1 ? 2 : 9))) + p.reorderPoint;
            }
          }
          const bySupplier = new Map<string, SimProduct[]>();
          for (const p of products) {
            if (p.onOrder || p.stock > p.reorderPoint || reorderAt < p.createdAt) continue;
            if (p.troubled && d >= DAYS - 10) continue; // supplier is "delayed"
            bySupplier.set(p.supplierId, [...(bySupplier.get(p.supplierId) ?? []), p]);
          }
          for (const [supplierId, list] of bySupplier) {
            const items = list.map((p) => {
              const need = p.target - p.stock;
              const qty = p.item.pop >= 3 ? Math.ceil(need / 6) * 6 : Math.max(2, need);
              p.onOrder = true;
              return { p, qty };
            });
            const id = randomUUID();
            counters.purchaseOrder++;
            const total = items.reduce((s, i) => s + i.qty * i.p.costPrice, 0);
            const taxTotal = items.reduce(
              (s, i) =>
                s + Math.round((i.qty * i.p.costPrice * i.p.item.gst) / (100 + i.p.item.gst)),
              0,
            );
            purchaseOrders.push({
              id,
              number: docNumber('PO', counters.purchaseOrder, reorderAt),
              supplierId,
              status: 'ORDERED',
              source: 'MANUAL',
              notes: 'Auto-replenishment',
              subtotal: total - taxTotal,
              taxTotal,
              total,
              createdById: admin.id,
              createdAt: reorderAt,
            });
            for (const i of items) {
              poItems.push({
                id: randomUUID(),
                purchaseOrderId: id,
                productId: i.p.id,
                quantity: i.qty,
                unitCost: i.p.costPrice,
                taxRate: i.p.item.gst,
                lineTotal: i.qty * i.p.costPrice,
              });
            }
            const lead = list[0]!.leadTime;
            openPOs.push({
              id,
              dueAt: new Date(startOfLocalDay(addDays(date, lead)).getTime() + 9 * HOUR),
              items,
            });
          }
        },
      });
    }

    events.sort((a, b) => a.at.getTime() - b.at.getTime());
    for (const e of events) e.run();
    for (const p of products) {
      p.dailySales.push(p.soldToday);
      p.soldToday = 0;
    }
    if (isToday) break;
  }

  // ── Expiry dates ──────────────────────────────────────────────────────────
  const expiry = new Map<string, Date>();
  for (const p of products) {
    if (p.item.life) expiry.set(p.id, new Date(p.lastReceivedAt.getTime() + p.item.life * DAY));
  }
  // A few batches close to expiry (and one past it) so the alerts have something to show.
  const packaged = products.filter((p) => p.item.life && p.stock > 3);
  for (let i = 0; i < 6; i++)
    expiry.set(pick(packaged).id, new Date(now.getTime() + int(3, 24) * DAY));
  expiry.set(pick(packaged).id, new Date(now.getTime() - 2 * DAY));

  // ── Persist ───────────────────────────────────────────────────────────────
  console.log('Writing records…');
  const byProduct = new Map(products.map((p) => [p.id, p]));
  await prisma.product.createMany({
    data: productRows.map((row) => {
      const p = byProduct.get(row.id!)!;
      return {
        ...row,
        stock: p.stock,
        reorderPoint: p.reorderPoint,
        expiryDate: expiry.get(p.id) ?? null,
      };
    }),
  });
  await prisma.customer.createMany({
    data: customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      loyaltyPoints: c.points,
      totalSpent: c.totalSpent,
      visitCount: c.visits,
      lastVisitAt: c.lastVisitAt,
      userId: c.userId,
      createdAt: c.createdAt < now ? c.createdAt : now,
    })),
  });

  const chunked = async <T>(rows: T[], write: (chunk: T[]) => Promise<unknown>, size = 4000) => {
    for (let i = 0; i < rows.length; i += size) await write(rows.slice(i, i + size));
  };
  await chunked(purchaseOrders, (data) => prisma.purchaseOrder.createMany({ data }));
  await chunked(poItems, (data) => prisma.purchaseOrderItem.createMany({ data }));
  await chunked(sales, (data) => prisma.sale.createMany({ data }));
  await chunked(saleItems, (data) => prisma.saleItem.createMany({ data }));
  await chunked(orders, (data) => prisma.order.createMany({ data }));
  await chunked(orderItems, (data) => prisma.orderItem.createMany({ data }));
  await chunked(returns, (data) => prisma.return.createMany({ data }));
  await chunked(returnItems, (data) => prisma.returnItem.createMany({ data }));
  await chunked(movements, (data) => prisma.stockMovement.createMany({ data }));
  await prisma.counter.createMany({
    data: Object.entries(counters).map(([key, value]) => ({ key, value })),
  });

  console.log(
    `Seeded ${products.length} products, ${customers.length} customers, ${sales.length} bills, ` +
      `${orders.length} online orders, ${purchaseOrders.length} purchase orders, ${returns.length} returns ` +
      `and ${movements.length} stock movements for ${STORE.name}.`,
  );

  if (embeddingsAvailable()) {
    console.log(
      'Computing product embeddings for semantic search (first run downloads the model)…',
    );
    const n = await embedProducts();
    console.log(`Embedded ${n} products.`);
  }

  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s.\n`);
  console.log('Demo sign-ins (password for all: ' + DEMO_PASSWORD + ')');
  console.log('  Admin    admin@quickbill.dev');
  console.log('  Manager  manager@quickbill.dev');
  console.log('  Cashier  priya@quickbill.dev');
  console.log('  Shopper  shopper@quickbill.dev');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
