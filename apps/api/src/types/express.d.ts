import type { Role } from '@quickbill/shared';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role; name: string };
    }
  }
}

export {};
