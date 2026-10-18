import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { app, bearer, resetDatabase, seedFixtures, tokenFor } from './helpers';

let fx: Awaited<ReturnType<typeof seedFixtures>>;
let cashier: string;

beforeEach(async () => {
  await resetDatabase();
  fx = await seedFixtures();
  cashier = await tokenFor('cashier@test.dev');
});
afterAll(() => prisma.$disconnect());

const checkout = (body: object, token = cashier) =>
  request(app).post('/api/v1/sales').set(bearer(token)).send(body);

describe('point of sale checkout', () => {
  it('prices from the server, decrements stock, writes the ledger and awards points', async () => {
    const res = await checkout({
      items: [
        { productId: fx.butter.id, quantity: 2 },
        { productId: fx.milk.id, quantity: 3 },
        { productId: fx.butter.id, quantity: 1 }, // duplicate lines merge
      ],
      customerId: fx.customer.id,
      paymentMethod: 'CASH',
      amountTendered: 30_000,
    });

    expect(res.status).toBe(201);
    const sale = res.body;
    expect(sale.number).toMatch(/^S-\d{2}-000001$/);
    expect(sale.subtotal).toBe(3 * 6_000 + 3 * 2_800);
    expect(sale.total).toBe(26_400);
    expect(sale.taxTotal).toBe(Math.round((18_000 * 5) / 105)); // milk is GST-exempt
    expect(sale.changeDue).toBe(3_600);
    expect(sale.pointsEarned).toBe(2);

    const butter = await prisma.product.findUniqueOrThrow({ where: { id: fx.butter.id } });
    expect(butter.stock).toBe(47);
    const ledger = await prisma.stockMovement.findMany({ where: { saleId: sale.id } });
    expect(ledger).toHaveLength(2);
    expect(ledger.find((m) => m.productId === fx.butter.id)).toMatchObject({
      delta: -3,
      balanceAfter: 47,
      reason: 'SALE',
    });

    const customer = await prisma.customer.findUniqueOrThrow({ where: { id: fx.customer.id } });
    expect(customer).toMatchObject({ loyaltyPoints: 502, totalSpent: 26_400, visitCount: 1 });
  });

  it('redeems loyalty points against at most half the bill', async () => {
    const res = await checkout({
      items: [{ productId: fx.butter.id, quantity: 1 }],
      customerId: fx.customer.id,
      paymentMethod: 'UPI',
      redeemPoints: 30,
    });
    expect(res.status).toBe(201);
    expect(res.body.discount).toBe(3_000);
    expect(res.body.total).toBe(3_000);

    const tooMany = await checkout({
      items: [{ productId: fx.butter.id, quantity: 1 }],
      customerId: fx.customer.id,
      paymentMethod: 'UPI',
      redeemPoints: 40,
    });
    expect(tooMany.status).toBe(422);
  });

  it('refuses to sell more than is in stock and leaves stock untouched', async () => {
    const res = await checkout({
      items: [
        { productId: fx.milk.id, quantity: 1 },
        { productId: fx.lastOne.id, quantity: 2 },
      ],
      paymentMethod: 'UPI',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.details).toMatchObject({ productId: fx.lastOne.id, available: 1 });
    // The whole transaction rolled back, including the milk line.
    const milk = await prisma.product.findUniqueOrThrow({ where: { id: fx.milk.id } });
    expect(milk.stock).toBe(100);
    expect(await prisma.sale.count()).toBe(0);
  });

  it('never sells the last unit twice when tills check out at the same moment', async () => {
    const attempts = await Promise.all(
      Array.from({ length: 6 }, () =>
        checkout({ items: [{ productId: fx.lastOne.id, quantity: 1 }], paymentMethod: 'CARD' }),
      ),
    );
    const statuses = attempts.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(5);

    const product = await prisma.product.findUniqueOrThrow({ where: { id: fx.lastOne.id } });
    expect(product.stock).toBe(0);
    expect(
      await prisma.stockMovement.count({ where: { productId: fx.lastOne.id, reason: 'SALE' } }),
    ).toBe(1);
  });

  it('treats a retried checkout with the same idempotency key as one sale', async () => {
    const body = {
      items: [{ productId: fx.butter.id, quantity: 1 }],
      paymentMethod: 'UPI',
      idempotencyKey: 'till-1-bill-42-abcdef',
    };
    const first = await checkout(body);
    const retry = await checkout(body);
    expect(first.status).toBe(201);
    expect(retry.body.id).toBe(first.body.id);
    const butter = await prisma.product.findUniqueOrThrow({ where: { id: fx.butter.id } });
    expect(butter.stock).toBe(49);
  });

  it('requires enough cash for cash payments', async () => {
    const res = await checkout({
      items: [{ productId: fx.butter.id, quantity: 1 }],
      paymentMethod: 'CASH',
      amountTendered: 5_000,
    });
    expect(res.status).toBe(422);
  });
});

describe('returns', () => {
  it('refunds what the customer actually paid and puts items back on the shelf', async () => {
    const sale = (
      await checkout({
        items: [{ productId: fx.butter.id, quantity: 4 }],
        customerId: fx.customer.id,
        paymentMethod: 'UPI',
        redeemPoints: 60, // 25% off: 24,000 → 18,000
      })
    ).body;
    expect(sale.total).toBe(18_000);

    const res = await request(app)
      .post('/api/v1/returns')
      .set(bearer(cashier))
      .send({
        saleId: sale.id,
        items: [{ saleItemId: sale.items[0].id, quantity: 2, restock: true }],
        reason: 'Damaged packaging',
        refundMethod: 'UPI',
      });
    expect(res.status).toBe(201);
    expect(res.body.refundAmount).toBe(9_000);
    const butter = await prisma.product.findUniqueOrThrow({ where: { id: fx.butter.id } });
    expect(butter.stock).toBe(48);

    const tooMany = await request(app)
      .post('/api/v1/returns')
      .set(bearer(cashier))
      .send({
        saleId: sale.id,
        items: [{ saleItemId: sale.items[0].id, quantity: 3, restock: true }],
        reason: 'Second attempt',
        refundMethod: 'UPI',
      });
    expect(tooMany.status).toBe(422);
  });
});

describe('online orders', () => {
  const order = {
    contact: { name: 'Guest Buyer', email: 'guest@example.com', phone: '9876500003' },
    shippingAddress: {
      line1: 'Flat 101, Lotus Residency',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411045',
    },
    paymentMethod: 'COD',
  };

  it('lets a guest order, reserves stock and adds delivery below the free threshold', async () => {
    const res = await request(app)
      .post('/api/v1/shop/orders')
      .send({ ...order, items: [{ productId: fx.milk.id, quantity: 2 }] });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: 'PENDING',
      subtotal: 5_600,
      shippingFee: 4_000,
      total: 9_600,
    });
    const milk = await prisma.product.findUniqueOrThrow({ where: { id: fx.milk.id } });
    expect(milk.stock).toBe(98);
  });

  it('only shows an order to someone who knows both its number and email', async () => {
    const placed = (
      await request(app)
        .post('/api/v1/shop/orders')
        .send({ ...order, items: [{ productId: fx.milk.id, quantity: 1 }] })
    ).body;
    const ok = await request(app)
      .post('/api/v1/shop/orders/lookup')
      .send({ number: placed.number, email: 'guest@example.com' });
    expect(ok.status).toBe(200);
    const wrongEmail = await request(app)
      .post('/api/v1/shop/orders/lookup')
      .send({ number: placed.number, email: 'other@example.com' });
    expect(wrongEmail.status).toBe(404);
  });

  it('restocks items when an order is cancelled and enforces the status flow', async () => {
    const placed = (
      await request(app)
        .post('/api/v1/shop/orders')
        .send({ ...order, items: [{ productId: fx.butter.id, quantity: 5 }] })
    ).body;
    const admin = await tokenFor('admin@test.dev');

    const skip = await request(app)
      .patch(`/api/v1/orders/${placed.id}/status`)
      .set(bearer(admin))
      .send({ status: 'DELIVERED' });
    expect(skip.status).toBe(422);

    const cancel = await request(app)
      .patch(`/api/v1/orders/${placed.id}/status`)
      .set(bearer(admin))
      .send({ status: 'CANCELLED' });
    expect(cancel.status).toBe(200);
    const butter = await prisma.product.findUniqueOrThrow({ where: { id: fx.butter.id } });
    expect(butter.stock).toBe(50);
  });
});

describe('storefront', () => {
  it('never exposes cost price, supplier or exact stock publicly', async () => {
    const res = await request(app).get('/api/v1/shop/products').query({ pageSize: 10 });
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    for (const p of res.body.items) {
      expect(p).not.toHaveProperty('costPrice');
      expect(p).not.toHaveProperty('supplier');
      expect(p).not.toHaveProperty('stock');
      expect(['in', 'low', 'out']).toContain(p.stockLevel);
    }
  });

  it('treats search input literally rather than as a pattern', async () => {
    const res = await request(app).get('/api/v1/shop/products').query({ q: '.*(a+)+$' });
    expect(res.status).toBe(200);
  });
});
