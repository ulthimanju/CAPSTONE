import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { OAuthCallbackPage } from '../pages/auth/OAuthCallbackPage';
import { ProfilePage } from '../pages/ProfilePage';
import { SessionsPage } from '../pages/SessionsPage';
import { AuthLayout } from '../layouts/AuthLayout';
import { AppLayout } from '../layouts/AppLayout';
import { ProtectedRoute, PublicRoute } from './ProtectedRoute';

import { WorkspacesPage } from '../pages/WorkspacesPage';
import { WorkspaceDetailPage } from '../pages/WorkspaceDetailPage';
import { LearningUnitDetailPage } from '../pages/LearningUnitDetailPage';
import { InvitationsPage } from '../pages/InvitationsPage';


export const AppRoutes = () => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          </PublicRoute>
        }
      />
      <Route path="/auth/callback" element={<OAuthCallbackPage />} />
      <Route
        path="/workspaces"
        element={
          <ProtectedRoute>
            <WorkspaceDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/workspaces/:workspaceId"
        element={
          <ProtectedRoute>
            <WorkspaceDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/workspaces/:workspaceId/units/:unitTitle"
        element={
          <ProtectedRoute>
            <LearningUnitDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/invitations"
        element={
          <ProtectedRoute>
            <InvitationsPage />
          </ProtectedRoute>
        }
      />


      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProfilePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SessionsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/workspaces" replace />} />
    </Routes>
  );
};

