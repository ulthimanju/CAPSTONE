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
 * WorkspaceLayoutWrapper
 * Dynamically switches active section and header actions reactively based on ?tab=
 */
function WorkspaceLayoutWrapper() {
  const { workspaceId } = useParams();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'summary';

  const renderSection = () => {
    switch (tab) {
      case 'learning':
        return <LearningSection workspaceId={workspaceId} />;
      case 'documents':
        return <DocumentsSection workspaceId={workspaceId} />;
      case 'chat':
        return <ChatSection workspaceId={workspaceId} />;
      case 'collaborators':
        return <CollaboratorsSection workspaceId={workspaceId} />;
      case 'invitations':
        return <InvitationsSection />;
      case 'summary':
      default:
        return <SummarySection workspaceId={workspaceId} />;
    }
  };

  const renderHeaderSlot = () => {
    switch (tab) {
      case 'learning':
        return <LearningHeaderActions workspaceId={workspaceId} />;
      case 'documents':
        return <DocumentsHeaderActions workspaceId={workspaceId} />;
      case 'chat':
        return <ChatHeaderActions workspaceId={workspaceId} />;
      case 'collaborators':
        return <CollaboratorsHeaderActions workspaceId={workspaceId} />;
      case 'invitations':
        return <InvitationsHeaderActions />;
      case 'summary':
      default:
        return <SummaryHeaderActions workspaceId={workspaceId} />;
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

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/workspaces" replace />} />
    </Routes>
  );
};
