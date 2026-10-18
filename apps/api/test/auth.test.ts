import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import {
  app,
  bearer,
  PASSWORD,
  refreshCookie,
  resetDatabase,
  seedFixtures,
  tokenFor,
} from './helpers';

beforeEach(async () => {
  await resetDatabase();
  await seedFixtures();
});
afterAll(() => prisma.$disconnect());

describe('authentication', () => {
  it('registers a shopper, links a customer record and issues a session', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Neha Shah',
      email: 'Neha@Example.com',
      password: 'Secret123',
      phone: '9876500002',
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'neha@example.com', role: 'CUSTOMER' });
    expect(res.body.accessToken).toBeTypeOf('string');
    expect(refreshCookie(res)).toMatch(/^qb_refresh=/);
    const customer = await prisma.customer.findFirst({ where: { email: 'neha@example.com' } });
    expect(customer?.userId).toBe(res.body.user.id);
  });

  it('keeps loyalty points when an in-store customer signs up with the same phone', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Riya Patil',
      email: 'riya.new@example.com',
      password: 'Secret123',
      phone: '9876500001',
    });
    expect(res.status).toBe(201);
    const customer = await prisma.customer.findUnique({ where: { phone: '9876500001' } });
    expect(customer?.userId).toBe(res.body.user.id);
    expect(customer?.loyaltyPoints).toBe(500);
  });

  it('rejects weak passwords and duplicate emails', async () => {
    const weak = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Weak', email: 'weak@example.com', password: 'short' });
    expect(weak.status).toBe(400);
    expect(weak.body.error.code).toBe('VALIDATION_ERROR');

    const dup = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Dup', email: 'admin@test.dev', password: 'Secret123' });
    expect(dup.status).toBe(409);
  });

  it('gives the same answer for an unknown email and a wrong password', async () => {
    const unknown = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@test.dev', password: PASSWORD });
    const wrong = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.dev', password: 'Wrong123' });
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body.error.message).toBe(wrong.body.error.message);
  });

  it('rotates refresh tokens and revokes the whole family when an old one is replayed', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.dev', password: PASSWORD });
    const first = refreshCookie(login);

    const rotated = await request(app).post('/api/v1/auth/refresh').set('Cookie', first);
    expect(rotated.status).toBe(200);
    const second = refreshCookie(rotated);
    expect(second).not.toBe(first);

    // Pretend the first token was rotated long ago, then replay it like a thief would.
    await prisma.refreshToken.updateMany({
      where: { revokedAt: { not: null } },
      data: { revokedAt: new Date(Date.now() - 60_000) },
    });
    const replay = await request(app).post('/api/v1/auth/refresh').set('Cookie', first);
    expect(replay.status).toBe(401);

    // The legitimate, newer token was revoked along with the family.
    const afterReplay = await request(app).post('/api/v1/auth/refresh').set('Cookie', second);
    expect(afterReplay.status).toBe(401);
  });

  it('does not clear cookies on a failed refresh that sent none', async () => {
    // A page-load refresh racing a login must not wipe the cookie the login sets.
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('logs out by revoking the refresh token', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'cashier@test.dev', password: PASSWORD });
    const cookie = refreshCookie(login);
    await request(app).post('/api/v1/auth/logout').set('Cookie', cookie).expect(204);
    await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie).expect(401);
  });
});

describe('role-based access', () => {
  it('requires a token for back-office routes', async () => {
    const res = await request(app).get('/api/v1/sales');
    expect(res.status).toBe(401);
  });

  it('keeps cashiers out of analytics, purchasing and staff management', async () => {
    const token = await tokenFor('cashier@test.dev');
    for (const path of [
      '/api/v1/analytics/dashboard',
      '/api/v1/purchase-orders',
      '/api/v1/staff',
      '/api/v1/ai/forecast',
    ]) {
      const res = await request(app).get(path).set(bearer(token));
      expect(res.status, path).toBe(403);
    }
    // ...but lets them sell.
    expect((await request(app).get('/api/v1/catalog/products').set(bearer(token))).status).toBe(
      200,
    );
  });

  it('keeps shoppers out of the back office entirely', async () => {
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Shopper', email: 'shopper@test.dev', password: 'Secret123' });
    const res = await request(app)
      .get('/api/v1/catalog/products')
      .set(bearer(reg.body.accessToken));
    expect(res.status).toBe(403);
  });

  it('stops an admin from removing the last admin', async () => {
    const token = await tokenFor('admin@test.dev');
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@test.dev' } });
    const res = await request(app)
      .patch(`/api/v1/staff/${admin.id}`)
      .set(bearer(token))
      .send({ isActive: false });
    expect(res.status).toBe(422);
  });
});
