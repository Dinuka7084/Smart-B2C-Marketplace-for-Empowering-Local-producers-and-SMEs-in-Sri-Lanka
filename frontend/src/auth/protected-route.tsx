import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';

import { useAuth } from './auth-context';
import { dashboardPathFor } from './paths';
import { Spinner } from '@/components/ui/spinner';
import type { UserRole } from '@/lib/api';

export function ProtectedRoute({
  roles,
  children,
}: {
  roles: UserRole[];
  children: ReactNode;
}) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Spinner className="size-5" /> Checking your session…
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={dashboardPathFor(user)} replace />;
  }

  return children;
}
