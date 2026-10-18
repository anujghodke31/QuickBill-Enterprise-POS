import { randomUUID } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import type { AuthResponse, LoginInput, RegisterInput, UserDTO } from '@quickbill/shared';
import { env } from '../../config/env';
import { conflict, unauthorized } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import type { User } from '../../generated/prisma/client';
import { createRefreshToken, hashRefreshToken, newTokenFamily, signAccessToken } from './tokens';

// Hash of a random string, verified against when the email is unknown so that
// "unknown email" and "wrong password" take the same time to answer.
const dummyHash = hash(randomUUID());

/** A rotated token used again within this window is treated as a benign race. */
const REUSE_GRACE_MS = 30_000;

export const hashPassword = (password: string) => hash(password);

export const toUserDTO = (u: Pick<User, 'id' | 'name' | 'email' | 'role'>): UserDTO => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
});

interface Session extends AuthResponse {
  refreshToken: string;
}

async function issueSession(user: User, familyId: string, userAgent?: string): Promise<Session> {
  const { raw, hash: tokenHash } = createRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      familyId,
      userAgent: userAgent?.slice(0, 200),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
    },
  });
  return { accessToken: signAccessToken(user), refreshToken: raw, user: toUserDTO(user) };
}

export async function login(input: LoginInput, userAgent?: string): Promise<Session> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const ok = await verify(user?.passwordHash ?? (await dummyHash), input.password);
  if (!user || !ok || !user.isActive) throw unauthorized('Invalid email or password');
  return issueSession(user, newTokenFamily(), userAgent);
}

export async function register(input: RegisterInput, userAgent?: string): Promise<Session> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict('An account with this email already exists');

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { name: input.name, email: input.email, passwordHash, role: 'CUSTOMER' },
    });
    // Link to an existing in-store customer record when the email or phone matches,
    // so loyalty points earned at the till follow the shopper online.
    const match = await tx.customer.findFirst({
      where: {
        userId: null,
        OR: [{ email: input.email }, ...(input.phone ? [{ phone: input.phone }] : [])],
      },
    });
    if (match) {
      await tx.customer.update({
        where: { id: match.id },
        data: { userId: created.id, email: match.email ?? input.email },
      });
    } else {
      await tx.customer.create({
        data: { name: input.name, email: input.email, phone: input.phone, userId: created.id },
      });
    }
    return created;
  });
  return issueSession(user, newTokenFamily(), userAgent);
}

export async function refresh(rawToken: string | undefined, userAgent?: string): Promise<Session> {
  if (!rawToken) throw unauthorized();
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(rawToken) },
    include: { user: true },
  });
  if (!stored) throw unauthorized();

  if (stored.revokedAt) {
    const sinceRevoked = Date.now() - stored.revokedAt.getTime();
    if (sinceRevoked > REUSE_GRACE_MS) {
      // A token that was rotated long ago is being replayed: assume it was stolen
      // and end every session descended from the same login.
      await prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    throw unauthorized();
  }
  if (stored.expiresAt < new Date() || !stored.user.isActive) throw unauthorized();

  // Rotate: the old token can no longer be used once a new one is issued.
  const { count } = await prisma.refreshToken.updateMany({
    where: { id: stored.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) throw unauthorized();
  return issueSession(stored.user, stored.familyId, userAgent);
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getMe(userId: string): Promise<UserDTO> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw unauthorized();
  return toUserDTO(user);
}
