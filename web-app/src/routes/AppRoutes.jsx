import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './ProtectedRoute';
import { AppLayout } from '../layouts/AppLayout';
import { SummarySection, SummaryHeaderActions } from '@/sections/summary';
import { LearningSection, LearningHeaderActions } from '@/sections/learning';
import { DocumentsSection, DocumentsHeaderActions } from '@/sections/documents';
import { ChatSection, ChatHeaderActions } from '@/sections/chat';
import { CollaboratorsSection, CollaboratorsHeaderActions } from '@/sections/collaborators';
import { InvitationsSection, InvitationsHeaderActions } from '@/sections/invitations';
import { AuthSection } from '@/sections/auth';
import { apiClient } from '@/services/api/client';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Route wrappers for each section providing its AppLayout shell and header action buttons
 */
function SummaryRoute() {
  const { workspaceId } = useParams();
  return (
    <AppLayout headerSlot={<SummaryHeaderActions workspaceId={workspaceId} />}>
      <SummarySection workspaceId={workspaceId} />
    </AppLayout>
  );
}

function LearningRoute() {
  const { workspaceId } = useParams();
  return (
    <AppLayout headerSlot={<LearningHeaderActions workspaceId={workspaceId} />}>
      <LearningSection workspaceId={workspaceId} />
    </AppLayout>
  );
}

function DocumentsRoute() {
  const { workspaceId } = useParams();
  return (
    <AppLayout headerSlot={<DocumentsHeaderActions workspaceId={workspaceId} />}>
      <DocumentsSection workspaceId={workspaceId} />
    </AppLayout>
  );
}

function ChatRoute() {
  const { workspaceId } = useParams();
  return (
    <AppLayout headerSlot={<ChatHeaderActions workspaceId={workspaceId} />}>
      <ChatSection workspaceId={workspaceId} />
    </AppLayout>
  );
}

function CollaboratorsRoute() {
  const { workspaceId } = useParams();
  return (
    <AppLayout headerSlot={<CollaboratorsHeaderActions workspaceId={workspaceId} />}>
      <CollaboratorsSection workspaceId={workspaceId} />
    </AppLayout>
  );
}

function InvitationsRoute() {
  return (
    <AppLayout headerSlot={<InvitationsHeaderActions />}>
      <InvitationsSection />
    </AppLayout>
  );
}

/**
 * WorkspaceIndexRedirect — Handles bare `/workspaces` route by redirecting to the user's first workspace summary
 */
function WorkspaceIndexRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchFirstWorkspace = async () => {
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
        console.error('[WorkspaceIndexRedirect] Failed:', err);
        if (!cancelled) setLoading(false);
      }
    };

    fetchFirstWorkspace();
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

function WorkspaceRootRedirect() {
  const { workspaceId } = useParams();
  return <Navigate to={`/workspaces/${workspaceId}/summary`} replace />;
}

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Auth Route */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthSection />
          </PublicRoute>
        }
      />

      {/* Protected Workspace Sub-Routes */}
      <Route
        path="/workspaces/:workspaceId/summary"
        element={
          <ProtectedRoute>
            <SummaryRoute />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspaces/:workspaceId/learning"
        element={
          <ProtectedRoute>
            <LearningRoute />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspaces/:workspaceId/documents"
        element={
          <ProtectedRoute>
            <DocumentsRoute />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspaces/:workspaceId/chat"
        element={
          <ProtectedRoute>
            <ChatRoute />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspaces/:workspaceId/collaborators"
        element={
          <ProtectedRoute>
            <CollaboratorsRoute />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspaces/:workspaceId/invitations"
        element={
          <ProtectedRoute>
            <InvitationsRoute />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspaces/:workspaceId"
        element={
          <ProtectedRoute>
            <WorkspaceRootRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspaces"
        element={
          <ProtectedRoute>
            <WorkspaceIndexRedirect />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/workspaces" replace />} />
    </Routes>
  );
};
