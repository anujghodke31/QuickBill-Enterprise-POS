import type { StaffCreateInput, StaffDTO, StaffUpdateInput } from '@quickbill/shared';
import { conflict, notFound, unprocessable } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { hashPassword } from '../auth/auth.service';
import type { User } from '../../generated/prisma/client';

function toStaffDTO(u: User & { _count: { sales: number } }): StaffDTO {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    salesCount: u._count.sales,
  };
}

const withCount = { _count: { select: { sales: true } } } as const;

export async function listStaff(): Promise<StaffDTO[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'MANAGER', 'CASHIER'] } },
    orderBy: [{ isActive: 'desc' }, { role: 'asc' }, { name: 'asc' }],
    include: withCount,
  });
  return users.map(toStaffDTO);
}

export async function createStaff(input: StaffCreateInput): Promise<StaffDTO> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict('An account with this email already exists');
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash: await hashPassword(input.password),
    },
    include: withCount,
  });
  return toStaffDTO(user);
}

export async function updateStaff(
  id: string,
  input: StaffUpdateInput,
  actingUserId: string,
): Promise<StaffDTO> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role === 'CUSTOMER') throw notFound('Staff member');

  if (
    id === actingUserId &&
    (input.isActive === false || (input.role && input.role !== user.role))
  ) {
    throw unprocessable('You cannot deactivate yourself or change your own role');
  }
  const losingAdmin =
    user.role === 'ADMIN' && (input.isActive === false || (input.role && input.role !== 'ADMIN'));
  if (losingAdmin) {
    const admins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
    if (admins <= 1) throw unprocessable('The store must keep at least one active admin');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.user.update({
      where: { id },
      data: {
        name: input.name,
        role: input.role,
        isActive: input.isActive,
        ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
      },
      include: withCount,
    });
    // Deactivating or resetting a password signs the person out everywhere.
    if (input.isActive === false || input.password) {
      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return result;
  });
  return toStaffDTO(updated);
}
