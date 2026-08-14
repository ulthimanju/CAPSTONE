/**
 * AppLayout — UI Composition Layer
 */

import React, { useCallback } from 'react';
import { useAppLayout }       from './AppLayout.logic';
import { AppLayoutTemplate }  from './AppLayout.layout';

export function AppLayout({ children, headerSlot }) {
  const {
    userInitials,
    userName,
    userEmail,
    logout,
    toggleTheme,
    isSidebarOpen,
    closeSidebar,
    toggleSidebar,
    workspaces,
    activeWorkspaceId,
    handleSelectWorkspace,
    activeTab,
    onSelectTab,
    onSelectWorkspace,
    onGoHome,
  } = useAppLayout();

  const handleAction = useCallback((action) => {
    if (action === 'toggle-theme') toggleTheme();
  }, [toggleTheme]);

  return (
    <AppLayoutTemplate
      isSidebarOpen={isSidebarOpen}
      onCloseSidebar={closeSidebar}
      onToggleSidebar={toggleSidebar}
      workspaces={workspaces}
      activeWorkspaceId={activeWorkspaceId}
      onSelectWorkspace={onSelectWorkspace}
      activeTab={activeTab}
      onSelectTab={onSelectTab}
      onAction={handleAction}
      onGoHome={onGoHome}
      onLogout={logout}
      userInitials={userInitials}
      userName={userName}
      userEmail={userEmail}
      headerSlot={headerSlot}
    >
      {children}
    </AppLayoutTemplate>
  );
}
