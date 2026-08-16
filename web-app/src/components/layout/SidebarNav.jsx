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

function DocumentsAnimatedIcon({ isHovered, className = 'h-4 w-4 shrink-0', ...props }) {
  const [animKey, setAnimKey] = React.useState(0);
  const prevHovered = React.useRef(false);

  React.useEffect(() => {
    if (isHovered && !prevHovered.current) {
      setAnimKey((k) => k + 1);
    }
    prevHovered.current = isHovered;
  }, [isHovered]);

  return (
    <svg
      key={animKey}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <title>folder-multiple</title>
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path
          strokeDasharray="62"
          d="M14 5h8c0.55 0 1 0.45 1 1v10c0 0.55 -0.45 1 -1 1h-16c-0.55 0 -1 -0.45 -1 -1v-11Z"
        >
          {animKey > 0 && (
            <animate
              fill="freeze"
              attributeName="stroke-dashoffset"
              dur="0.6s"
              values="62;0"
            />
          )}
        </path>
        <path
          d="M14 5h-9v-1c0 -0.55 0.45 -1 1 -1h6Z"
          opacity={animKey > 0 ? '0' : '1'}
        >
          {animKey > 0 && (
            <>
              <set fill="freeze" attributeName="opacity" begin="0.6s" to="1" />
              <animate
                fill="freeze"
                attributeName="d"
                begin="0.6s"
                dur="0.2s"
                values="M14 5h-9v0c0 0 0.45 0 1 0h6Z;M14 5h-9v-1c0 -0.55 0.45 -1 1 -1h6Z"
              />
            </>
          )}
        </path>
        <path
          d="M19 21h-17c-0.55 0 -1 -0.45 -1 -1v-13"
          opacity={animKey > 0 ? '0' : '1'}
        >
          {animKey > 0 && (
            <>
              <set fill="freeze" attributeName="opacity" begin="0.8s" to="1" />
              <animate
                fill="freeze"
                attributeName="d"
                begin="0.8s"
                dur="0.2s"
                values="M22 17h-16c-0.55 0 -1 -0.45 -1 -1v-12;M19 21h-17c-0.55 0 -1 -0.45 -1 -1v-13"
              />
            </>
          )}
        </path>
      </g>
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
      icon: DocumentsAnimatedIcon,
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
