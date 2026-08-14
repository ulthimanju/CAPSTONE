import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet, useParams, useNavigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './ProtectedRoute';
import { AppLayout } from '../layouts/AppLayout';

import { SummarySection } from '@/sections/summary';
import { LearningSection } from '@/sections/learning';
import { DocumentsSection } from '@/sections/documents';
import { ChatSection } from '@/sections/chat';
import { CollaboratorsSection } from '@/sections/collaborators';
import { InvitationsSection } from '@/sections/invitations';
import { AuthSection } from '@/sections/auth';
import { apiClient } from '@/services/api/client';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';

// ─────────────────────────────────────────────────────────────────────────────
// AppLayoutShell — persistent shell containing Sidebar, Header & Outlet
// ─────────────────────────────────────────────────────────────────────────────

function AppLayoutShell() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Route wrappers passing workspaceId param down to sections
// ─────────────────────────────────────────────────────────────────────────────

function SummaryRoute() {
  const { workspaceId } = useParams();
  return <SummarySection workspaceId={workspaceId} />;
}

function LearningRoute() {
  const { workspaceId } = useParams();
  return <LearningSection workspaceId={workspaceId} />;
}

function DocumentsRoute() {
  const { workspaceId } = useParams();
  return <DocumentsSection workspaceId={workspaceId} />;
}

function ChatRoute() {
  const { workspaceId } = useParams();
  return <ChatSection workspaceId={workspaceId} />;
}

function CollaboratorsRoute() {
  const { workspaceId } = useParams();
  return <CollaboratorsSection workspaceId={workspaceId} />;
}

function InvitationsRoute() {
  return <InvitationsSection />;
}

// ─────────────────────────────────────────────────────────────────────────────
// WorkspaceIndexRedirect — /workspaces → /workspaces/:firstId/summary
// ─────────────────────────────────────────────────────────────────────────────

function WorkspaceIndexRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const run = async () => {
      try {
        const headers = {};
        if (user?.id) headers['X-User-ID'] = user.id;
        if (user?.email) headers['X-User-Email'] = user.email;

        const res = await apiClient.get('/api/v1/workspaces', { headers });
        const list = Array.isArray(res.data) ? res.data : (res.data?.workspaces ?? []);

        if (!cancelled) {
          if (list.length > 0) {
            navigate(`/workspaces/${list[0].id}/summary`, { replace: true });
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('[WorkspaceIndexRedirect]', err);
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [user, navigate]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="lg" />
      </div>
    );
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
// AppRoutes
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
        <Route path="summary" element={<SummaryRoute />} />
        <Route path="learning" element={<LearningRoute />} />
        <Route path="documents" element={<DocumentsRoute />} />
        <Route path="chat" element={<ChatRoute />} />
        <Route path="collaborators" element={<CollaboratorsRoute />} />
        <Route path="invitations" element={<InvitationsRoute />} />
        <Route index element={<Navigate to="summary" replace />} />
      </Route>

      {/* /workspaces — pick first workspace and redirect */}
      <Route
        path="/workspaces"
        element={<ProtectedRoute><WorkspaceIndexRedirect /></ProtectedRoute>}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/workspaces" replace />} />
    </Routes>
  );
};
