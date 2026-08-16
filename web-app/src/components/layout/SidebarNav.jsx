import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FolderOpenDot, ScrollText, Sparkles, Bot, Waypoints, Users, Settings } from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/cn';

function SummaryIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M15 4H7m11 12l3 3l-3 3" />
      <path d="M3 4v13a2 2 0 0 0 2 2h16M7 14h7M7 9h12" />
    </svg>
  );
}

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
      icon: FolderOpenDot,
      isActive:
        location.pathname === basePath ||
        location.pathname.startsWith(`${basePath}/documents`),
    },
    {
      label: 'Summary',
      to: `${basePath}/summary`,
      icon: SummaryIcon,
      isActive: location.pathname.startsWith(`${basePath}/summary`),
    },
    {
      label: 'AI Tutor',
      to: `${basePath}/chat`,
      icon: Bot,
      isActive: location.pathname.startsWith(`${basePath}/chat`),
    },
    {
      label: 'Learning Path',
      to: `${basePath}/learning-path`,
      icon: Waypoints,
      isActive: location.pathname.startsWith(`${basePath}/learning-path`),
    },
    {
      label: 'Manage Workspace',
      to: `${basePath}/manage`,
      icon: Settings,
      isActive:
        location.pathname.startsWith(`${basePath}/manage`) ||
        location.pathname.startsWith(`${basePath}/collaborators`) ||
        location.pathname.startsWith(`${basePath}/settings`),
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
              'flex items-center gap-3 rounded-ui px-3 py-2 text-xs font-mono font-medium transition-all duration-150',
              item.isActive
                ? 'bg-bg font-bold text-accent border border-accent/40 shadow-xs ring-1 ring-accent/15'
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
      })}
    </div>
  );
}

export default SidebarNav;
