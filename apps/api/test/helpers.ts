import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/modules/auth/auth.service';

export const app = createApp();
export const PASSWORD = 'Test@1234';

export async function resetDatabase() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE "AiConversation", "BillScan", "ReturnItem", "Return", "SaleItem", "Sale",
      "OrderItem", "Order", "PurchaseOrderItem", "PurchaseOrder", "StockMovement", "Product",
      "Category", "Supplier", "Customer", "RefreshToken", "User", "Counter" CASCADE`);
}

/** A small store: two staff, a customer with points, a category, a supplier and three products. */
export async function seedFixtures() {
  const passwordHash = await hashPassword(PASSWORD);
  const [admin, cashier] = await Promise.all([
    prisma.user.create({
      data: { name: 'Asha Admin', email: 'admin@test.dev', role: 'ADMIN', passwordHash },
    }),
    prisma.user.create({
      data: { name: 'Cal Cashier', email: 'cashier@test.dev', role: 'CASHIER', passwordHash },
    }),
  ]);
  const category = await prisma.category.create({
    data: { name: 'Dairy & Eggs', slug: 'dairy-and-eggs', department: 'Fresh' },
  });
  const supplier = await prisma.supplier.create({ data: { name: 'Test Dairy', leadTimeDays: 2 } });
  const product = (sku: string, name: string, price: number, stock: number, taxRate = 5) =>
    prisma.product.create({
      data: {
        sku,
        name,
        slug: sku.toLowerCase(),
        barcode: `890000000${sku.slice(-4)}`,
        categoryId: category.id,
        supplierId: supplier.id,
        price,
        costPrice: Math.round(price * 0.8),
        taxRate,
        stock,
        isPublished: true,
      },
    });
  const butter = await product('QB-T0001', 'Amul Butter 100 g', 6_000, 50);
  const milk = await product('QB-T0002', 'Amul Taaza Milk 500 ml', 2_800, 100, 0);
  const lastOne = await product('QB-T0003', 'Saffron 1 g', 30_000, 1, 5);
  const customer = await prisma.customer.create({
    data: {
      name: 'Riya Patil',
      phone: '9876500001',
      email: 'riya@example.com',
      loyaltyPoints: 500,
    },
  });
  return { admin, cashier, category, supplier, butter, milk, lastOne, customer };
}

export async function tokenFor(email: string, password = PASSWORD): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  if (res.status !== 200)
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.accessToken as string;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Extracts the refresh cookie ("qb_refresh=...") from a response. */
export function refreshCookie(res: request.Response): string {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = raw?.find((c) => c.startsWith('qb_refresh='));
  if (!cookie) throw new Error('No refresh cookie on response');
  return cookie.split(';')[0]!;
}
