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

function DocumentsFilesFilledIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <title>files-filled</title>
      <path
        fill="currentColor"
        d="m11 2l3 .001V8a1 1 0 0 0 .883.993L15 9h6v6a3 3 0 0 1-3 3h-1v1a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h1V5a3 3 0 0 1 3-3M8 8H7a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-1h-4a3 3 0 0 1-3-3zm12.415-1H16V2.585z"
      />
    </svg>
  );
}

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
      icon: DocumentsFilesFilledIcon,
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
