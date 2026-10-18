import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Role } from '@quickbill/shared';
import { env } from '../../config/env';

const ISSUER = 'quickbill';
const AUDIENCE = 'quickbill-api';

export interface AccessTokenClaims {
  sub: string;
  role: Role;
  name: string;
}

export function signAccessToken(user: { id: string; role: Role; name: string }): string {
  return jwt.sign({ role: user.role, name: user.name }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithm: 'HS256',
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithms: ['HS256'],
  });
  if (typeof payload === 'string' || !payload.sub) throw new Error('Malformed token');
  return { sub: payload.sub, role: payload.role as Role, name: String(payload.name ?? '') };
}

/** Opaque refresh token: 48 random bytes, only ever stored as an HMAC digest. */
export function createRefreshToken() {
  const raw = randomBytes(48).toString('base64url');
  return { raw, hash: hashRefreshToken(raw) };
}

export function hashRefreshToken(raw: string): string {
  return createHmac('sha256', env.JWT_REFRESH_SECRET).update(raw).digest('hex');
}

export const newTokenFamily = () => randomUUID();

export const REFRESH_COOKIE = 'qb_refresh';

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'strict' as const,
    path: '/api/v1/auth',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}
