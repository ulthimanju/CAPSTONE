import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useWorkspacesQuery } from '@/features/workspaces/hooks/useWorkspaces';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/cn';
import {
  DocumentsIcon,
  SummaryIcon,
  LearningPathIcon,
  AITutorIcon,
  Settings,
} from '@/components/ui';

function SidebarNavItem({ item, closeMobileSidebar, disabled }) {
  const Icon = item.icon;

  if (disabled) {
    return (
      <div
        className="flex items-center gap-3 rounded-ui px-3 py-2 text-xs font-mono font-medium text-text/40 opacity-40 cursor-not-allowed select-none border border-transparent"
        title="Create or select a workspace to access this feature"
      >
        <Icon className="h-4 w-4 shrink-0 text-text/30" aria-hidden="true" />
        <span>{item.label}</span>
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      onClick={closeMobileSidebar}
      className={cn(
        'flex items-center gap-3 rounded-ui px-3 py-2 text-xs font-mono font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        item.isActive
          ? 'bg-accent text-on-accent font-bold border border-accent shadow-xs'
          : 'text-text/75 hover:bg-surface-hover hover:text-text border border-transparent'
      )}
    >
      {item.customIconSrc ? (
        <img
          src={item.customIconSrc}
          alt={item.label}
          className="h-4 w-4 shrink-0 object-contain"
        />
      ) : (
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <span>{item.label}</span>
    </NavLink>
  );
}

export function SidebarNav() {
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const closeMobileSidebar = useUIStore((state) => state.closeMobileSidebar);
  const location = useLocation();

  // Extract workspaceId from URL path if on a workspace route
  const pathMatch = location.pathname.match(/\/workspaces\/([0-9a-fA-F-]+)/);
  const routeWorkspaceId = pathMatch ? pathMatch[1] : null;

  const { data, isLoading } = useWorkspacesQuery();
  const workspaces = data?.workspaces || [];

  // Determine if valid workspaces exist
  const currentWsId = routeWorkspaceId || activeWorkspaceId;
  const hasWorkspaces = Boolean(currentWsId) || (!isLoading && workspaces.length > 0);
  const validWorkspaceId = currentWsId || (workspaces.length > 0 ? workspaces[0].id : null);

  const basePath = validWorkspaceId ? `/workspaces/${validWorkspaceId}` : '#';

  const navItems = [
    {
      label: 'Documents',
      to: `${basePath}/documents`,
      icon: DocumentsIcon,
      isActive:
        Boolean(validWorkspaceId) &&
        (location.pathname === basePath ||
          location.pathname.startsWith(`${basePath}/documents`)),
    },
    {
      label: 'Summary',
      to: `${basePath}/summary`,
      icon: SummaryIcon,
      isActive: Boolean(validWorkspaceId) && location.pathname.startsWith(`${basePath}/summary`),
    },
    {
      label: 'Clarify Doubts',
      to: `${basePath}/chat`,
      icon: AITutorIcon,
      isActive: Boolean(validWorkspaceId) && location.pathname.startsWith(`${basePath}/chat`),
    },
    {
      label: 'Learning Path',
      to: `${basePath}/learning-path`,
      icon: LearningPathIcon,
      isActive: Boolean(validWorkspaceId) && location.pathname.startsWith(`${basePath}/learning-path`),
    },
    {
      label: 'Manage Workspace',
      to: `${basePath}/manage`,
      icon: Settings,
      isActive:
        Boolean(validWorkspaceId) &&
        (location.pathname.startsWith(`${basePath}/manage`) ||
          location.pathname.startsWith(`${basePath}/collaborators`) ||
          location.pathname.startsWith(`${basePath}/settings`)),
    },
  ];

  return (
    <div className="space-y-1">
      <div className="px-3 py-1 font-mono text-[11px] font-semibold tracking-wider text-text/50 uppercase flex items-center justify-between">
        <span>Workspace</span>
        {!hasWorkspaces && !isLoading && (
          <span className="text-[10px] font-normal lowercase text-text/40 tracking-normal">(none)</span>
        )}
      </div>

      {navItems.map((item) => (
        <SidebarNavItem
          key={item.label}
          item={item}
          disabled={!hasWorkspaces}
          closeMobileSidebar={closeMobileSidebar}
        />
      ))}
    </div>
  );
}

export default SidebarNav;
