import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet, useParams, useNavigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './ProtectedRoute';
import { AppLayout } from '../layouts/AppLayout';
import { HeaderSlotProvider, useHeaderSlot } from '../contexts/HeaderSlotContext';

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

// ─────────────────────────────────────────────────────────────────────────────
// AppLayoutShell — single persistent AppLayout for all workspace routes.
// HeaderSlotProvider wraps the Outlet so each section can push its own header.
// ─────────────────────────────────────────────────────────────────────────────

function AppLayoutShell() {
  return (
    <HeaderSlotProvider>
      <AppLayoutShellInner />
    </HeaderSlotProvider>
  );
}

function AppLayoutShellInner() {
  const { headerSlot } = useHeaderSlot();

  return (
    <AppLayout headerSlot={headerSlot}>
      <Outlet />
    </AppLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section route components — each mounts its OWN header actions into the slot,
// then renders its section content. No duplicate hook calls.
// ─────────────────────────────────────────────────────────────────────────────

function SummarySectionRoute() {
  const { workspaceId } = useParams();
  const { setHeaderSlot } = useHeaderSlot();

  useEffect(() => {
    setHeaderSlot(<SummaryHeaderActions workspaceId={workspaceId} />);
    return () => setHeaderSlot(null);
  }, [workspaceId, setHeaderSlot]);

  return <SummarySection workspaceId={workspaceId} />;
}

function LearningSectionRoute() {
  const { workspaceId } = useParams();
  const { setHeaderSlot } = useHeaderSlot();

  useEffect(() => {
    setHeaderSlot(<LearningHeaderActions workspaceId={workspaceId} />);
    return () => setHeaderSlot(null);
  }, [workspaceId, setHeaderSlot]);

  return <LearningSection workspaceId={workspaceId} />;
}

function DocumentsSectionRoute() {
  const { workspaceId } = useParams();
  const { setHeaderSlot } = useHeaderSlot();

  useEffect(() => {
    setHeaderSlot(<DocumentsHeaderActions workspaceId={workspaceId} />);
    return () => setHeaderSlot(null);
  }, [workspaceId, setHeaderSlot]);

  return <DocumentsSection workspaceId={workspaceId} />;
}

function ChatSectionRoute() {
  const { workspaceId } = useParams();
  const { setHeaderSlot } = useHeaderSlot();

  useEffect(() => {
    setHeaderSlot(<ChatHeaderActions workspaceId={workspaceId} />);
    return () => setHeaderSlot(null);
  }, [workspaceId, setHeaderSlot]);

  return <ChatSection workspaceId={workspaceId} />;
}

function CollaboratorsSectionRoute() {
  const { workspaceId } = useParams();
  const { setHeaderSlot } = useHeaderSlot();

  useEffect(() => {
    setHeaderSlot(<CollaboratorsHeaderActions workspaceId={workspaceId} />);
    return () => setHeaderSlot(null);
  }, [workspaceId, setHeaderSlot]);

  return <CollaboratorsSection workspaceId={workspaceId} />;
}

function InvitationsSectionRoute() {
  const { setHeaderSlot } = useHeaderSlot();

  useEffect(() => {
    setHeaderSlot(<InvitationsHeaderActions />);
    return () => setHeaderSlot(null);
  }, [setHeaderSlot]);

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
            // Navigate to workspace root — no tab is forced, index route shows summary by default
            navigate(`/workspaces/${list[0].id}`, { replace: true });
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

      {/* Single persistent AppLayout via AppLayoutShell + Outlet */}
      <Route
        path="/workspaces/:workspaceId"
        element={<ProtectedRoute><AppLayoutShell /></ProtectedRoute>}
      >
        <Route path="summary"       element={<SummarySectionRoute />} />
        <Route path="learning"      element={<LearningSectionRoute />} />
        <Route path="documents"     element={<DocumentsSectionRoute />} />
        <Route path="chat"          element={<ChatSectionRoute />} />
        <Route path="collaborators" element={<CollaboratorsSectionRoute />} />
        <Route path="invitations"   element={<InvitationsSectionRoute />} />
        <Route index                element={<Navigate to="summary" replace />} />
      </Route>

      {/* /workspaces → redirect to first workspace */}
      <Route
        path="/workspaces"
        element={<ProtectedRoute><WorkspaceIndexRedirect /></ProtectedRoute>}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/workspaces" replace />} />
    </Routes>
  );
};
