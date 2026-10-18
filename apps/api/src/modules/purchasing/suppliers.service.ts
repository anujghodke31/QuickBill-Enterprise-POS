import type { SupplierDTO, supplierInputSchema } from '@quickbill/shared';
import type { z } from 'zod';
import { conflict, notFound } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import type { Supplier } from '../../generated/prisma/client';

type SupplierInput = z.output<typeof supplierInputSchema>;

function toSupplierDTO(s: Supplier & { _count: { products: number } }): SupplierDTO {
  return {
    id: s.id,
    name: s.name,
    contactName: s.contactName,
    email: s.email,
    phone: s.phone,
    gstin: s.gstin,
    address: s.address,
    leadTimeDays: s.leadTimeDays,
    isActive: s.isActive,
    productCount: s._count.products,
    createdAt: s.createdAt.toISOString(),
  };
}

const withCount = { _count: { select: { products: { where: { isActive: true } } } } } as const;

export async function listSuppliers(): Promise<SupplierDTO[]> {
  const rows = await prisma.supplier.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    include: withCount,
  });
  return rows.map(toSupplierDTO);
}

export async function getSupplier(id: string): Promise<SupplierDTO> {
  const supplier = await prisma.supplier.findUnique({ where: { id }, include: withCount });
  if (!supplier) throw notFound('Supplier');
  return toSupplierDTO(supplier);
}

export async function createSupplier(input: SupplierInput): Promise<SupplierDTO> {
  const clash = await prisma.supplier.findFirst({
    where: { name: { equals: input.name, mode: 'insensitive' } },
  });
  if (clash) throw conflict('A supplier with this name already exists');
  return toSupplierDTO(await prisma.supplier.create({ data: input, include: withCount }));
}

export async function updateSupplier(
  id: string,
  input: Partial<SupplierInput>,
): Promise<SupplierDTO> {
  const existing = await prisma.supplier.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Supplier');
  return toSupplierDTO(
    await prisma.supplier.update({ where: { id }, data: input, include: withCount }),
  );
}
