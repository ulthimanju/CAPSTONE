import React, { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './ProtectedRoute';
import { AppLayout } from '../layouts/AppLayout';

import { SummarySection } from '@/sections/summary';
import { LearningSection } from '@/sections/learning';
import { LearningUnitSection } from '@/sections/learning-unit';
import { DocumentsSection } from '@/sections/documents';
import { ChatSection } from '@/sections/chat';
import { CollaboratorsSection } from '@/sections/collaborators';
import { InvitationsSection } from '@/sections/invitations';
import { AuthSection } from '@/sections/auth';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Spinner } from '@/components/ui/Spinner';

// ─────────────────────────────────────────────────────────────────────────────
// AppLayoutShell — routing boundary composing persistent layout with Outlet
// ─────────────────────────────────────────────────────────────────────────────

function AppLayoutShell() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WorkspaceIndexRedirect — /workspaces → /workspaces/:firstId/summary
// ─────────────────────────────────────────────────────────────────────────────

function WorkspaceIndexRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { workspaces, isLoading, isInitialized, fetchWorkspaces } = useWorkspaceStore();

  useEffect(() => {
    if (!user) return;
    fetchWorkspaces(user).then((list) => {
      if (list && list.length > 0) {
        navigate(`/workspaces/${list[0].id}/summary`, { replace: true });
      }
    });
  }, [user, fetchWorkspaces, navigate]);

  if (isLoading || !isInitialized) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (workspaces.length > 0) {
    return <Navigate to={`/workspaces/${workspaces[0].id}/summary`} replace />;
  }

  return (
    <AppLayout>
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No workspaces found. Create a workspace to get started.
      </div>
    </AppLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AppRoutes — Single Source of Truth for Routing
// ─────────────────────────────────────────────────────────────────────────────

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><AuthSection /></PublicRoute>} />

      {/* Persistent Workspace Layout Route */}
      <Route
        path="/workspaces/:workspaceId"
        element={<ProtectedRoute><AppLayoutShell /></ProtectedRoute>}
      >
        <Route path="summary" element={<SummarySection />} />
        <Route path="learning" element={<LearningSection />} />
        <Route path="learning/:unitId" element={<LearningUnitSection />} />
        <Route path="documents" element={<DocumentsSection />} />
        <Route path="chat" element={<ChatSection />} />
        <Route path="collaborators" element={<CollaboratorsSection />} />
        <Route path="invitations" element={<InvitationsSection />} />
        <Route index element={<Navigate to="summary" replace />} />
      </Route>

      {/* Root workspaces redirect */}
      <Route
        path="/workspaces"
        element={<ProtectedRoute><WorkspaceIndexRedirect /></ProtectedRoute>}
      />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/workspaces" replace />} />
    </Routes>
  );
};
