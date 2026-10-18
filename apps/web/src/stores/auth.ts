import { create } from 'zustand';
import type { AuthResponse, Role, UserDTO } from '@quickbill/shared';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  status: Status;
  user: UserDTO | null;
  /** Kept in memory only; the refresh token lives in an httpOnly cookie. */
  accessToken: string | null;
  setSession: (session: AuthResponse) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  accessToken: null,
  setSession: ({ user, accessToken }) => set({ user, accessToken, status: 'authenticated' }),
  clear: () => set({ user: null, accessToken: null, status: 'anonymous' }),
}));

export const STAFF_ROLES: Role[] = ['ADMIN', 'MANAGER', 'CASHIER'];
export const MANAGEMENT_ROLES: Role[] = ['ADMIN', 'MANAGER'];

export function isStaff(user: UserDTO | null): boolean {
  return !!user && STAFF_ROLES.includes(user.role);
}

export function canManage(user: UserDTO | null): boolean {
  return !!user && MANAGEMENT_ROLES.includes(user.role);
}

/** Where to send someone right after they sign in. */
export function homeFor(user: UserDTO): string {
  if (user.role === 'CASHIER') return '/admin/pos';
  if (isStaff(user)) return '/admin';
  return '/';
}
