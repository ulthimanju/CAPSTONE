import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { UploadQueueWidget } from '@/features/documents/components/UploadQueueWidget';
import { cn } from '@/lib/cn';

export function AppLayout({
  sidebarHeader,
  sidebarFooter,
  sidebarNavigation,
  headerTitle,
  headerActions,
  children,
  className,
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg text-text font-body relative">
      {/* Accessible Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-ui focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent focus:shadow-theme"
      >
        Skip to main content
      </a>

      {/* Sidebar: Fixed 280px on Desktop, Off-Canvas Drawer on Tablet & Mobile */}
      <Sidebar header={sidebarHeader} footer={sidebarFooter}>
        {sidebarNavigation}
      </Sidebar>

      {/* Main Layout Area: flex: 1 on Desktop, 100% width on Mobile/Tablet */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Header: Displays on all screens (with hamburger toggle on tablet & mobile) */}
        <Header title={headerTitle}>
          {headerActions}
        </Header>

        {/* Main Content Area: 100% width on Mobile/Tablet, flex-1 scrollable */}
        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            'flex-1 w-full overflow-y-auto outline-none',
            className
          )}
        >
          {children || <Outlet />}
        </main>
      </div>

      {/* Global Multi-File Upload Queue Progress Manager */}
      <UploadQueueWidget />
    </div>
  );
}

export default AppLayout;
