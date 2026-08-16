import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/cn';
import {
  DocumentsIcon,
  SummaryIcon,
  LearningPathIcon,
  AITutorIcon,
  Settings,
} from '@/components/ui';

function SidebarNavItem({ item, closeMobileSidebar }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      onClick={closeMobileSidebar}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
        <Icon isHovered={isHovered} className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <span>{item.label}</span>
    </NavLink>
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
      icon: DocumentsIcon,
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
      icon: AITutorIcon,
      isActive: location.pathname.startsWith(`${basePath}/chat`),
    },
    {
      label: 'Learning Path',
      to: `${basePath}/learning-path`,
      icon: LearningPathIcon,
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

      {navItems.map((item) => (
        <SidebarNavItem
          key={item.to}
          item={item}
          closeMobileSidebar={closeMobileSidebar}
        />
      ))}
    </div>
  );
}

export default SidebarNav;
