import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { AuthCallbackPage } from '@/features/auth/pages/AuthCallbackPage';
import { WorkspacesPage } from '@/features/workspaces/pages/WorkspacesPage';
import { WorkspaceDetailPage } from '@/features/workspaces/pages/WorkspaceDetailPage';
import { OverviewTab } from '@/features/workspaces/components/tabs/OverviewTab';
import { DocumentsTab } from '@/features/workspaces/components/tabs/DocumentsTab';
import { CollaboratorsTab } from '@/features/workspaces/components/tabs/CollaboratorsTab';
import { SettingsTab } from '@/features/workspaces/components/tabs/SettingsTab';
import { DocumentReaderPage } from '@/features/documents/pages/DocumentReaderPage';
import { ROUTES } from '@/config/constants';

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
          <Route path="/workspaces/:workspaceId" element={<WorkspaceDetailPage />}>
            <Route index element={<OverviewTab />} />
            <Route path="overview" element={<OverviewTab />} />
            <Route path="documents" element={<DocumentsTab />} />
            <Route path="documents/:documentId" element={<DocumentReaderPage />} />
            <Route path="collaborators" element={<CollaboratorsTab />} />
            <Route path="settings" element={<SettingsTab />} />
          </Route>
        </Route>
      </Route>

      {/* Default Root & 404 Fallbacks */}
      <Route path="/" element={<Navigate to={ROUTES.WORKSPACES} replace />} />
      <Route path="*" element={<Navigate to={ROUTES.WORKSPACES} replace />} />
    </Routes>
  );
}

export default AppRoutes;
