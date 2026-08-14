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
  const tab = searchParams.get('tab') || 'summary';

  const renderSection = () => {
    switch (tab) {
      case 'learning':
        return <LearningSection key={`learning-${workspaceId}`} workspaceId={workspaceId} />;
      case 'documents':
        return <DocumentsSection key={`documents-${workspaceId}`} workspaceId={workspaceId} />;
      case 'chat':
        return <ChatSection key={`chat-${workspaceId}`} workspaceId={workspaceId} />;
      case 'collaborators':
        return <CollaboratorsSection key={`collaborators-${workspaceId}`} workspaceId={workspaceId} />;
      case 'invitations':
        return <InvitationsSection key="invitations" />;
      case 'summary':
      default:
        return <SummarySection key={`summary-${workspaceId}`} workspaceId={workspaceId} />;
    }
  };

  const renderHeaderSlot = () => {
    switch (tab) {
      case 'learning':
        return <LearningHeaderActions key={`learning-actions-${workspaceId}`} workspaceId={workspaceId} />;
      case 'documents':
        return <DocumentsHeaderActions key={`documents-actions-${workspaceId}`} workspaceId={workspaceId} />;
      case 'chat':
        return <ChatHeaderActions key={`chat-actions-${workspaceId}`} workspaceId={workspaceId} />;
      case 'collaborators':
        return <CollaboratorsHeaderActions key={`collaborators-actions-${workspaceId}`} workspaceId={workspaceId} />;
      case 'invitations':
        return <InvitationsHeaderActions key="invitations-actions" />;
      case 'summary':
      default:
        return <SummaryHeaderActions key={`summary-actions-${workspaceId}`} workspaceId={workspaceId} />;
    }
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
