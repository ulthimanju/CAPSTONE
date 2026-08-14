import React from 'react';
import { Routes, Route, Navigate, useParams, useSearchParams } from 'react-router-dom';
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
 * Main Layout Container Component
 * Renders AppLayout shell and passes header action buttons into headerSlot
 */
function WorkspaceLayoutWrapper() {
  const { workspaceId } = useParams();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');

  const renderSection = () => {
    if (tab === 'learning') return <LearningSection workspaceId={workspaceId} />;
    if (tab === 'documents') return <DocumentsSection workspaceId={workspaceId} />;
    if (tab === 'chat') return <ChatSection workspaceId={workspaceId} />;
    if (tab === 'collaborators') return <CollaboratorsSection workspaceId={workspaceId} />;
    if (tab === 'invitations') return <InvitationsSection />;
    return <SummarySection workspaceId={workspaceId} />;
  };

  const renderHeaderSlot = () => {
    if (tab === 'learning') return <LearningHeaderActions workspaceId={workspaceId} />;
    if (tab === 'documents') return <DocumentsHeaderActions workspaceId={workspaceId} />;
    if (tab === 'chat') return <ChatHeaderActions workspaceId={workspaceId} />;
    if (tab === 'collaborators') return <CollaboratorsHeaderActions workspaceId={workspaceId} />;
    if (tab === 'invitations') return <InvitationsHeaderActions />;
    if (!tab || tab === 'summary') return <SummaryHeaderActions workspaceId={workspaceId} />;
    return null;
  };

  return (
    <AppLayout headerSlot={renderHeaderSlot()}>
      {renderSection()}
    </AppLayout>
  );
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

      {/* Protected Workspace Routes */}
      <Route
        path="/workspaces/:workspaceId?"
        element={
          <ProtectedRoute>
            <WorkspaceLayoutWrapper />
          </ProtectedRoute>
        }
      />

      {/* Catch-all Fallback */}
      <Route path="*" element={<Navigate to="/workspaces" replace />} />
    </Routes>
  );
};
