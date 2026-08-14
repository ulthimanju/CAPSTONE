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

// ─────────────────────────────────────────────────────────────────────────────
// WorkspaceShell
//
// Renders the correct section based on the `:section` URL param.
// AppLayout stays mounted across tab switches — only the section content swaps.
// Stable `key` props on sections prevent unnecessary remounts.
// ─────────────────────────────────────────────────────────────────────────────

function WorkspaceShell() {
  const { workspaceId, section = 'summary' } = useParams();

  let sectionNode;
  let headerSlot;

  switch (section) {
    case 'learning':
      sectionNode = <LearningSection key={`learning-${workspaceId}`} workspaceId={workspaceId} />;
      headerSlot  = <LearningHeaderActions workspaceId={workspaceId} />;
      break;
    case 'documents':
      sectionNode = <DocumentsSection key={`documents-${workspaceId}`} workspaceId={workspaceId} />;
      headerSlot  = <DocumentsHeaderActions workspaceId={workspaceId} />;
      break;
    case 'chat':
      sectionNode = <ChatSection key={`chat-${workspaceId}`} workspaceId={workspaceId} />;
      headerSlot  = <ChatHeaderActions workspaceId={workspaceId} />;
      break;
    case 'collaborators':
      sectionNode = <CollaboratorsSection key={`collaborators-${workspaceId}`} workspaceId={workspaceId} />;
      headerSlot  = <CollaboratorsHeaderActions workspaceId={workspaceId} />;
      break;
    case 'invitations':
      sectionNode = <InvitationsSection key={`invitations-${workspaceId}`} workspaceId={workspaceId} />;
      headerSlot  = <InvitationsHeaderActions />;
      break;
    case 'summary':
    default:
      sectionNode = <SummarySection key={`summary-${workspaceId}`} workspaceId={workspaceId} />;
      headerSlot  = <SummaryHeaderActions workspaceId={workspaceId} />;
      break;
  }

  return (
    <AppLayout headerSlot={headerSlot}>
      {sectionNode}
    </AppLayout>
  );
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

      {/* Workspace with explicit section — WorkspaceShell stays mounted, section swaps */}
      <Route
        path="/workspaces/:workspaceId/:section"
        element={<ProtectedRoute><WorkspaceShell /></ProtectedRoute>}
      />

      {/* Workspace without section — default to summary */}
      <Route
        path="/workspaces/:workspaceId"
        element={<ProtectedRoute><WorkspaceShell /></ProtectedRoute>}
      />

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
