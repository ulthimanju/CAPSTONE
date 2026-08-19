import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStatus, AUTH_STATUS } from '@/features/auth/hooks/useAuth';
import { CircleNotch } from '@/components/ui/icons';
import { ROUTES } from '@/config/constants';

export function ProtectedRoute({ redirectPath = ROUTES.LOGIN }) {
  const { status } = useAuthStatus();
  const location = useLocation();

  // 1. UNKNOWN State: Validating credentials with server
  if (status === AUTH_STATUS.UNKNOWN) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-bg font-body text-text">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl font-bold tracking-tight text-text">
              SYNAPSE
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-text/60">
            <CircleNotch className="h-4 w-4 animate-spin text-accent" aria-hidden="true" />
            <span>Validating authentication session...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. UNAUTHENTICATED State: Expired, invalid, or missing token
  if (status === AUTH_STATUS.UNAUTHENTICATED) {
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // 3. AUTHENTICATED State: Server-confirmed user session
  return <Outlet />;
}

export default ProtectedRoute;
