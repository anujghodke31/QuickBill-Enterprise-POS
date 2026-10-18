import type { CustomerDTO, CustomerInput, Paginated, SaleSummaryDTO } from '@quickbill/shared';
import type { Customer } from '../../generated/prisma/client';
import { conflict, notFound } from '../../lib/errors';
import { paginate, paginated } from '../../lib/pagination';
import { prisma, type Prisma } from '../../lib/prisma';
import { saleSummaryInclude, toSaleSummaryDTO } from '../sales/sales.mappers';

export function toCustomerDTO(c: Customer): CustomerDTO {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    loyaltyPoints: c.loyaltyPoints,
    totalSpent: c.totalSpent,
    visitCount: c.visitCount,
    lastVisitAt: c.lastVisitAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

const SORTS = {
  recent: { lastVisitAt: { sort: 'desc', nulls: 'last' } },
  spend: { totalSpent: 'desc' },
  name: { name: 'asc' },
  points: { loyaltyPoints: 'desc' },
} satisfies Record<string, Prisma.CustomerOrderByWithRelationInput>;

export type CustomerSort = keyof typeof SORTS;

export async function listCustomers(query: {
  q?: string;
  sort: CustomerSort;
  page: number;
  pageSize: number;
}): Promise<Paginated<CustomerDTO>> {
  const where: Prisma.CustomerWhereInput = query.q
    ? {
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { phone: { startsWith: query.q } },
          { email: { contains: query.q, mode: 'insensitive' } },
        ],
      }
    : {};
  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: [SORTS[query.sort], { id: 'asc' }],
      ...paginate(query.page, query.pageSize),
    }),
    prisma.customer.count({ where }),
  ]);
  return paginated(rows.map(toCustomerDTO), total, query.page, query.pageSize);
}

export async function getCustomer(
  id: string,
): Promise<CustomerDTO & { recentSales: SaleSummaryDTO[] }> {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw notFound('Customer');
  const sales = await prisma.sale.findMany({
    where: { customerId: id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: saleSummaryInclude,
  });
  return { ...toCustomerDTO(customer), recentSales: sales.map(toSaleSummaryDTO) };
}

export async function findByPhone(phone: string): Promise<CustomerDTO | null> {
  const customer = await prisma.customer.findUnique({ where: { phone } });
  return customer ? toCustomerDTO(customer) : null;
}

async function assertUnique(input: Partial<CustomerInput>, excludeId?: string) {
  const or: Prisma.CustomerWhereInput[] = [];
  if (input.phone) or.push({ phone: input.phone });
  if (input.email) or.push({ email: input.email });
  if (or.length === 0) return;
  const clash = await prisma.customer.findFirst({
    where: { OR: or, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  if (clash) {
    throw conflict(
      clash.phone === input.phone
        ? 'A customer with this phone number already exists'
        : 'A customer with this email already exists',
    );
  }
}

export async function createCustomer(input: CustomerInput): Promise<CustomerDTO> {
  await assertUnique(input);
  return toCustomerDTO(await prisma.customer.create({ data: input }));
}

export async function updateCustomer(
  id: string,
  input: Partial<CustomerInput>,
): Promise<CustomerDTO> {
  await assertUnique(input, id);
  const existing = await prisma.customer.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Customer');
  return toCustomerDTO(await prisma.customer.update({ where: { id }, data: input }));
}
