import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './ProtectedRoute';
import { AppLayout } from '../layouts/AppLayout';
import { SummarySection, SummaryHeaderActions } from '@/sections/summary';
import { LearningSection, LearningHeaderActions } from '@/sections/learning';
import { DocumentsSection, DocumentsHeaderActions } from '@/sections/documents';
import { ChatSection, ChatHeaderActions } from '@/sections/chat';
import { CollaboratorsSection, CollaboratorsHeaderActions } from '@/sections/collaborators';
import { InvitationsSection, InvitationsHeaderActions } from '@/sections/invitations';
import { AuthSection } from '@/sections/auth';

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
            <SummaryRoute />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/workspaces" replace />} />
    </Routes>
  );
};
