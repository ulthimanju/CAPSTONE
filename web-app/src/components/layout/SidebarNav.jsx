import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Layers } from 'lucide-react';
import { ROUTES } from '@/config/constants';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useWorkspaceQuery } from '@/features/workspaces/hooks/useWorkspaces';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

export function SidebarNav() {
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const { data: activeWorkspace } = useWorkspaceQuery(activeWorkspaceId);

  const navItems = [
    {
      label: 'Dashboard',
      to: ROUTES.DASHBOARD,
      icon: LayoutDashboard,
    },
    {
      label: 'Workspaces',
      to: ROUTES.WORKSPACES,
      icon: Layers,
    },
    {
      label: 'Documents',
      to: ROUTES.DOCUMENTS,
      icon: FileText,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Active Workspace Banner (if selected) */}
      {activeWorkspace && (
        <div className="rounded-ui border border-sep-line bg-sand/60 p-3">
          <div className="flex items-center justify-between text-[11px] font-mono text-text/60">
            <span>Active Workspace</span>
            <Badge variant={activeWorkspace.domain_type === 'TECHNICAL' ? 'technical' : 'nonTechnical'} className="text-[9px] py-0 px-1.5">
              {activeWorkspace.domain_type === 'TECHNICAL' ? 'Tech' : 'Non-Tech'}
            </Badge>
          </div>
          <p className="mt-1 font-display text-xs font-bold text-text truncate" title={activeWorkspace.name}>
            {activeWorkspace.name}
          </p>
        </div>
      )}

      {/* Primary Navigation Links */}
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-ui px-3 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-sand font-semibold text-accent'
                    : 'text-text/70 hover:bg-surface-hover hover:text-text'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

export default SidebarNav;
