import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FileText, Users, Settings } from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/cn';

export function SidebarNav() {
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const closeMobileSidebar = useUIStore((state) => state.closeMobileSidebar);
  const location = useLocation();

  if (!activeWorkspaceId) {
    return null;
  }

  const basePath = `/workspaces/${activeWorkspaceId}`;

  const navItems = [
    {
      label: 'Documents',
      to: `${basePath}/documents`,
      icon: FileText,
      isActive:
        location.pathname === basePath ||
        location.pathname.startsWith(`${basePath}/documents`),
    },
    {
      label: 'Collaborators',
      to: `${basePath}/collaborators`,
      icon: Users,
      isActive: location.pathname.startsWith(`${basePath}/collaborators`),
    },
    {
      label: 'Settings',
      to: `${basePath}/settings`,
      icon: Settings,
      isActive: location.pathname.startsWith(`${basePath}/settings`),
    },
  ];

  return (
    <div className="space-y-1">
      <div className="px-3 py-1 font-mono text-[11px] font-semibold tracking-wider text-text/50 uppercase">
        Workspace
      </div>

      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={closeMobileSidebar}
            className={cn(
              'flex items-center gap-3 rounded-ui px-3 py-2 text-xs font-mono font-medium transition-colors',
              item.isActive
                ? 'bg-sand font-bold text-accent shadow-theme'
                : 'text-text/70 hover:bg-surface-hover hover:text-text'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
}

export default SidebarNav;
