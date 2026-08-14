import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
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

// ─────────────────────────────────────────────────────────────────────────────
// AppLayoutShell
//
// ONE persistent AppLayout that stays mounted across all workspace tab changes.
// Only the <Outlet> (section content) swaps — sidebar/header never remount.
// ─────────────────────────────────────────────────────────────────────────────

function AppLayoutShell() {
  const { workspaceId } = useParams();
  const location = useLocation();

  // Derive current sub-tab from URL so headerSlot updates on every navigation
  const subpath = location.pathname.split('/').filter(Boolean)[2] || 'summary';

  const headerSlot = (() => {
    switch (subpath) {
      case 'summary':       return <SummaryHeaderActions workspaceId={workspaceId} />;
      case 'learning':      return <LearningHeaderActions workspaceId={workspaceId} />;
      case 'documents':     return <DocumentsHeaderActions workspaceId={workspaceId} />;
      case 'chat':          return <ChatHeaderActions workspaceId={workspaceId} />;
      case 'collaborators': return <CollaboratorsHeaderActions workspaceId={workspaceId} />;
      case 'invitations':   return <InvitationsHeaderActions />;
      default:              return null;
    }
  })();

  return (
    <AppLayout headerSlot={headerSlot}>
      <Outlet />
    </AppLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section components that read workspaceId from params directly
// ─────────────────────────────────────────────────────────────────────────────

function SummarySectionRoute()       { const { workspaceId } = useParams(); return <SummarySection workspaceId={workspaceId} />; }
function LearningSectionRoute()      { const { workspaceId } = useParams(); return <LearningSection workspaceId={workspaceId} />; }
function DocumentsSectionRoute()     { const { workspaceId } = useParams(); return <DocumentsSection workspaceId={workspaceId} />; }
function ChatSectionRoute()          { const { workspaceId } = useParams(); return <ChatSection workspaceId={workspaceId} />; }
function CollaboratorsSectionRoute() { const { workspaceId } = useParams(); return <CollaboratorsSection workspaceId={workspaceId} />; }
function InvitationsSectionRoute()   { return <InvitationsSection />; }

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

      {/* Single persistent AppLayout shell — only <Outlet> swaps between tabs */}
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
        {/* bare /workspaces/:id → summary */}
        <Route index element={<Navigate to="summary" replace />} />
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
