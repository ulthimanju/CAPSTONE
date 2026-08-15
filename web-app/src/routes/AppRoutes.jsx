import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { AuthCallbackPage } from '@/features/auth/pages/AuthCallbackPage';
import { ROUTES } from '@/config/constants';

function DashboardPlaceholder() {
  return (
    <div className="p-6">
      <h2 className="font-display text-xl font-bold text-text">Dashboard</h2>
      <p className="mt-1 font-body text-sm text-text/70">
        Welcome to SYNAPSE. Select or create a workspace to begin collaborative AI learning.
      </p>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Protected Application Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path={ROUTES.DASHBOARD} element={<DashboardPlaceholder />} />
          <Route path={ROUTES.WORKSPACES} element={<DashboardPlaceholder />} />
          <Route path="/workspaces/:workspaceId" element={<DashboardPlaceholder />} />
          <Route path={ROUTES.DOCUMENTS} element={<DashboardPlaceholder />} />
        </Route>
      </Route>

      {/* Default Root & 404 Fallbacks */}
      <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  );
}

export default AppRoutes;
