/**
 * AppLayout — UI Composition Layer
 *
 * Connects the logic hook to the layout template.
 * Thin by design — no state, no markup.
 */

import React, { useCallback } from 'react';
import { useAppLayout }       from './AppLayout.logic';
import { AppLayoutTemplate }  from './AppLayout.layout';

export function AppLayout({ children, headerSlot }) {
  const {
    userInitials, userName, userEmail, logout,
    theme, toggleTheme,
    isSidebarOpen, closeSidebar, toggleSidebar,
    workspaces, activeWorkspace, activeWorkspaceId,
    handleSelectWorkspace, handleNavigate,
  } = useAppLayout();

  /**
   * Central action dispatcher for config-driven sidebar actions.
   * Add new actions here as the config grows.
   */
  const handleAction = useCallback((action) => {
    if (action === 'toggle-theme') toggleTheme();
  }, [toggleTheme]);

  return (
    <AppLayoutTemplate
      // Sidebar state
      isSidebarOpen={isSidebarOpen}
      onCloseSidebar={closeSidebar}
      onToggleSidebar={toggleSidebar}

      // Workspace data
      workspaces={workspaces}
      activeWorkspace={activeWorkspace}
      activeWorkspaceId={activeWorkspaceId}
      onSelectWorkspace={handleSelectWorkspace}

      // Actions
      onAction={handleAction}
      onGoHome={() => handleNavigate('/workspaces')}
      onLogout={logout}

      // User
      userInitials={userInitials}
      userName={userName}
      userEmail={userEmail}

      // Content
      headerSlot={headerSlot}
    >
      {children}
    </AppLayoutTemplate>
  );
}
