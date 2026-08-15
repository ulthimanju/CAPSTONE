import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { AuthCallbackPage } from '@/features/auth/pages/AuthCallbackPage';
import { WorkspacesPage } from '@/features/workspaces/pages/WorkspacesPage';
import { ROUTES } from '@/config/constants';

function WorkspaceDetailPlaceholder() {
  return (
    <div className="p-6">
      <h2 className="font-display text-xl font-bold text-text">Workspace View</h2>
      <p className="mt-1 font-body text-sm text-text/70">
        Workspace content modules, documents, and collaboration tools.
      </p>
    </div>
  );
}

function DocumentsPlaceholder() {
  return (
    <div className="p-6">
      <h2 className="font-display text-xl font-bold text-text">Document Hub</h2>
      <p className="mt-1 font-body text-sm text-text/70">
        Synced Google Drive documents and syllabus files.
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
          <Route path={ROUTES.WORKSPACES} element={<WorkspacesPage />} />
          <Route path="/workspaces/:workspaceId" element={<WorkspaceDetailPlaceholder />} />
          <Route path={ROUTES.DOCUMENTS} element={<DocumentsPlaceholder />} />
        </Route>
      </Route>

      {/* Default Root & 404 Fallbacks */}
      <Route path="/" element={<Navigate to={ROUTES.WORKSPACES} replace />} />
      <Route path="*" element={<Navigate to={ROUTES.WORKSPACES} replace />} />
    </Routes>
  );
}

export default AppRoutes;
