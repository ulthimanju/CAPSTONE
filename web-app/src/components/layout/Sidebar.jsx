import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { X, Envelope, Bell, Archive } from '@/components/ui/icons';
import { useUIStore } from '@/store/uiStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useUserPendingInvitationsQuery } from '@/features/workspaces/hooks/useMembers';
import { useNotificationsQuery } from '@/features/notifications/hooks/useNotifications';
import { UserProfileMenu } from './UserProfileMenu';
import { SidebarNav } from './SidebarNav';
import { cn } from '@/lib/cn';

export function Sidebar({ header, footer, children, className }) {
  const isMobileSidebarOpen = useUIStore((state) => state.isMobileSidebarOpen);
  const closeMobileSidebar = useUIStore((state) => state.closeMobileSidebar);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);

  const { data: pendingInvitations = [] } = useUserPendingInvitationsQuery();
  const pendingInvitesCount = Array.isArray(pendingInvitations) ? pendingInvitations.length : 0;

  const { data: notificationsData } = useNotificationsQuery({ limit: 1 });
  const unreadNotificationsCount = notificationsData?.unread_count || 0;

  const invitationsPath = '/invitations';
  const notificationsPath = '/notifications';
  const archivedWorkspacesPath = '/archived-workspaces';

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isMobileSidebarOpen) {
        closeMobileSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileSidebarOpen, closeMobileSidebar]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileSidebarOpen]);

  const sidebarContent = (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden bg-surface-raised text-text">
      {/* Sidebar Header / Brand */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-sep-line px-4 sm:px-6">
        {header || (
          <span className="font-display text-lg font-bold tracking-tight text-text">
            SYNAPSE
          </span>
        )}
        <button
          type="button"
          onClick={closeMobileSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-ui text-text/70 hover:bg-surface-hover hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Navigation / Main Scrollable Content */}
      <nav aria-label="Main Navigation" className="flex-1 overflow-y-auto p-4 space-y-1">
        {children !== undefined ? children : <SidebarNav />}
      </nav>

      {/* Bottom Nav Items: Invitations, Notifications & Archived Workspaces */}
      <div className="shrink-0 px-3 py-1.5 border-t border-sep-line/60 space-y-1">
        <NavLink
          to={invitationsPath}
          onClick={closeMobileSidebar}
          className={({ isActive }) =>
            cn(
              'flex items-center justify-between rounded-ui px-3 py-2 text-xs font-mono font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              isActive
                ? 'bg-accent text-on-accent font-bold border border-accent shadow-xs'
                : 'text-text/75 hover:bg-surface-hover hover:text-text border border-transparent'
            )
          }
        >
          <div className="flex items-center gap-3">
            <Envelope className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Invitations</span>
          </div>
          {pendingInvitesCount > 0 && (
            <span className="rounded-full bg-sand px-1.5 py-0.2 font-mono text-[10px] font-bold text-accent">
              {pendingInvitesCount}
            </span>
          )}
        </NavLink>
        <NavLink
          to={notificationsPath}
          onClick={closeMobileSidebar}
          className={({ isActive }) =>
            cn(
              'flex items-center justify-between rounded-ui px-3 py-2 text-xs font-mono font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              isActive
                ? 'bg-accent text-on-accent font-bold border border-accent shadow-xs'
                : 'text-text/75 hover:bg-surface-hover hover:text-text border border-transparent'
            )
          }
        >
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Notifications</span>
          </div>
          {unreadNotificationsCount > 0 && (
            <span className="rounded-full bg-sand px-1.5 py-0.2 font-mono text-[10px] font-bold text-accent">
              {unreadNotificationsCount}
            </span>
          )}
        </NavLink>
        <NavLink
          to={archivedWorkspacesPath}
          onClick={closeMobileSidebar}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-ui px-3 py-2 text-xs font-mono font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              isActive
                ? 'bg-accent text-on-accent font-bold border border-accent shadow-xs'
                : 'text-text/75 hover:bg-surface-hover hover:text-text border border-transparent'
            )
          }
        >
          <Archive className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Archived Workspaces</span>
        </NavLink>
      </div>

      {/* Sidebar Footer / User Profile List */}
      <div className="shrink-0 p-3 pt-1 border-t border-sep-line/40">
        {footer !== undefined ? footer : <UserProfileMenu />}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar (280px) */}
      <aside
        className={cn(
          'hidden lg:flex lg:w-[280px] lg:shrink-0 lg:flex-col lg:border-r lg:border-sep-line',
          className
        )}
      >
        {sidebarContent}
      </aside>

      {/* Tablet & Mobile Off-Canvas Drawer */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden transition-visibility duration-300',
          isMobileSidebarOpen ? 'visible' : 'invisible pointer-events-none'
        )}
        aria-hidden={!isMobileSidebarOpen}
      >
        {/* Backdrop Overlay */}
        <div
          onClick={closeMobileSidebar}
          className={cn(
            'fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300 ease-in-out',
            isMobileSidebarOpen ? 'opacity-100' : 'opacity-0'
          )}
          aria-hidden="true"
        />

        {/* Drawer Panel */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Drawer"
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col shadow-theme transition-transform duration-300 ease-in-out',
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  );
}

export default Sidebar;
