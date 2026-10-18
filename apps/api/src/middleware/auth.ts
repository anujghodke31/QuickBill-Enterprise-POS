import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@quickbill/shared';
import { forbidden, unauthorized } from '../lib/errors';
import { verifyAccessToken } from '../modules/auth/tokens';

export const STAFF: Role[] = ['ADMIN', 'MANAGER', 'CASHIER'];
export const MANAGEMENT: Role[] = ['ADMIN', 'MANAGER'];

function readBearer(req: Request): string | null {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
}

/** Requires a valid access token and attaches `req.user`. */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = readBearer(req);
  if (!token) throw unauthorized();
  try {
    const claims = verifyAccessToken(token);
    req.user = { id: claims.sub, role: claims.role, name: claims.name };
  } catch {
    throw unauthorized('Your session has expired. Please sign in again.');
  }
  next();
}

/** Attaches `req.user` when a valid token is present, but never rejects. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readBearer(req);
  if (token) {
    try {
      const claims = verifyAccessToken(token);
      req.user = { id: claims.sub, role: claims.role, name: claims.name };
    } catch {
      // Treat an invalid token on a public route as anonymous.
    }
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw unauthorized();
    if (!roles.includes(req.user.role)) throw forbidden();
    next();
  };
}

/** Returns the authenticated user inside a handler protected by `authenticate`. */
export function currentUser(req: Request) {
  if (!req.user) throw unauthorized();
  return req.user;
}
