import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import type { Role } from '@quickbill/shared';
import { Spinner } from '@/components/ui/display';
import { isStaff, useAuth } from '@/stores/auth';

function FullScreenSpinner() {
  return (
    <div className="grid min-h-dvh place-items-center text-peacock-600">
      <Spinner className="size-6" />
    </div>
  );
}

/** Requires a signed-in user, optionally with one of the given roles. */
export function RequireAuth({
  roles,
  children,
  fallback = '/',
}: {
  roles?: Role[];
  children: ReactNode;
  fallback?: string;
}) {
  const { status, user } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullScreenSpinner />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (roles && !roles.includes(user.role)) return <Navigate to={fallback} replace />;
  return <>{children}</>;
}

export function RequireStaff({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  if (status !== 'loading' && user && !isStaff(user)) return <Navigate to="/" replace />;
  return (
    <RequireAuth roles={['ADMIN', 'MANAGER', 'CASHIER']} fallback="/">
      {children}
    </RequireAuth>
  );
}
