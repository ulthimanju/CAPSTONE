import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Layers,
  CaretUpDown,
  Check,
  CircleNotch,
  User,
  Users,
} from '@/components/ui/icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/DropdownMenu';
import { Badge } from '@/components/ui/Badge';
import { CodeBoldIcon, BookLinearIcon, PlusIcon } from '@/components/ui';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { useWorkspacesQuery, useWorkspaceQuery } from '../hooks/useWorkspaces';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/cn';

export function WorkspaceSelector({ className }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract workspaceId reliably from the URL path even when rendered outside child routes
  const pathMatch = location.pathname.match(/\/workspaces\/([0-9a-fA-F-]+)/);
  const routeWorkspaceId = pathMatch ? pathMatch[1] : null;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'OWNED' | 'COLLABORATED'

  const user = useAuthStore((state) => state.user);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const setActiveWorkspaceId = useWorkspaceStore((state) => state.setActiveWorkspaceId);

  const { data, isLoading } = useWorkspacesQuery();
  const workspaces = data?.workspaces || [];

  const currentTargetId = routeWorkspaceId || activeWorkspaceId;
  const isFoundInList = workspaces.some((w) => w.id === currentTargetId);
  const { data: detailWorkspace } = useWorkspaceQuery(currentTargetId, {
    enabled: Boolean(currentTargetId) && !isFoundInList,
  });

  const allWorkspaces = React.useMemo(() => {
    if (detailWorkspace && !workspaces.some((w) => w.id === detailWorkspace.id)) {
      return [detailWorkspace, ...workspaces];
    }
    return workspaces;
  }, [workspaces, detailWorkspace]);

  const isOwned = (ws) => {
    if (ws.user_role === 'OWNER') return true;
    if (user?.id && ws.owner_id === user.id) return true;
    if (user?.sub && ws.owner_id === user.sub) return true;
    return false;
  };

  const ownedCount = allWorkspaces.filter(isOwned).length;
  const collaboratedCount = allWorkspaces.filter((w) => !isOwned(w)).length;

  const filteredWorkspaces = allWorkspaces.filter((ws) => {
    if (filter === 'OWNED') return isOwned(ws);
    if (filter === 'COLLABORATED') return !isOwned(ws);
    return true;
  });

  // Determine current active workspace
  const currentWorkspace =
    allWorkspaces.find((w) => w.id === currentTargetId) ||
    detailWorkspace ||
    (allWorkspaces.length > 0 ? allWorkspaces[0] : null);

  // Sync Path param or fallback to active workspace store
  useEffect(() => {
    if (routeWorkspaceId) {
      if (routeWorkspaceId !== activeWorkspaceId) {
        setActiveWorkspaceId(routeWorkspaceId);
      }
    } else if (allWorkspaces.length > 0) {
      if (!activeWorkspaceId || !allWorkspaces.some((w) => w.id === activeWorkspaceId)) {
        setActiveWorkspaceId(allWorkspaces[0].id);
      }
    } else if (!isLoading && allWorkspaces.length === 0 && activeWorkspaceId) {
      setActiveWorkspaceId(null);
    }
  }, [routeWorkspaceId, activeWorkspaceId, allWorkspaces, isLoading, setActiveWorkspaceId]);

  const handleSelectWorkspace = (ws) => {
    setActiveWorkspaceId(ws.id);
    navigate(`/workspaces/${ws.id}`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex items-center gap-2.5 rounded-ui border border-sep-line bg-surface-raised px-3 py-1.5 text-left transition-all hover:bg-surface-hover hover:border-sep-line/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              className
            )}
            aria-label="Select workspace"
          >
            {isLoading ? (
              <CircleNotch className="h-4 w-4 animate-spin text-accent" />
            ) : currentWorkspace?.domain_type === 'TECHNICAL' ? (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-ui bg-accent/10 text-accent">
                <CodeBoldIcon className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            ) : currentWorkspace?.domain_type === 'NON_TECHNICAL' ? (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-ui bg-sand text-text/80">
                <BookLinearIcon className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            ) : (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-ui bg-sand text-text/80">
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            )}

            <div className="flex flex-col min-w-0 max-w-[180px] sm:max-w-[240px]">
              <span className="truncate font-display text-xs font-bold text-text">
                {currentWorkspace ? currentWorkspace.name : 'Select Workspace'}
              </span>
            </div>

            {currentWorkspace && (
              <Badge
                variant={currentWorkspace.domain_type === 'TECHNICAL' ? 'technical' : 'nonTechnical'}
                className="hidden sm:inline-flex text-[9px] py-0 px-1.5"
              >
                {currentWorkspace.domain_type === 'TECHNICAL' ? 'Tech' : 'Non-Tech'}
              </Badge>
            )}

            <CaretUpDown className="h-3.5 w-3.5 shrink-0 text-text/50" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-72 max-w-sm">
          <DropdownMenuLabel className="flex items-center justify-between pb-1.5">
            <span className="font-display font-bold text-xs">Workspaces</span>
            <span className="text-[10px] text-text/60 font-mono">
              {filteredWorkspaces.length} of {workspaces.length}
            </span>
          </DropdownMenuLabel>

          {/* Type Filter Pills: All | Owned | Collaborated */}
          <div className="px-2 pb-2">
            <div className="flex rounded-ui border border-sep-line bg-bg p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setFilter('ALL');
                }}
                className={cn(
                  'flex-1 rounded px-2 py-1 text-[10px] font-semibold transition-colors text-center',
                  filter === 'ALL'
                    ? 'bg-sand font-bold text-accent shadow-xs'
                    : 'text-text/70 hover:text-text'
                )}
              >
                All ({workspaces.length})
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setFilter('OWNED');
                }}
                className={cn(
                  'flex-1 rounded px-2 py-1 text-[10px] font-semibold transition-colors text-center',
                  filter === 'OWNED'
                    ? 'bg-sand font-bold text-accent shadow-xs'
                    : 'text-text/70 hover:text-text'
                )}
              >
                Owned ({ownedCount})
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setFilter('COLLABORATED');
                }}
                className={cn(
                  'flex-1 rounded px-2 py-1 text-[10px] font-semibold transition-colors text-center',
                  filter === 'COLLABORATED'
                    ? 'bg-sand font-bold text-accent shadow-xs'
                    : 'text-text/70 hover:text-text'
                )}
              >
                Shared ({collaboratedCount})
              </button>
            </div>
          </div>

          <DropdownMenuSeparator />

          <div className="max-h-56 overflow-y-auto py-1">
            {filteredWorkspaces.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs font-mono text-text/60">
                {filter === 'OWNED'
                  ? 'No owned workspaces'
                  : filter === 'COLLABORATED'
                  ? 'No collaborated workspaces'
                  : 'No workspaces available'}
              </div>
            ) : (
              filteredWorkspaces.map((ws) => {
                const isSelected = ws.id === currentWorkspace?.id;
                const isTech = ws.domain_type === 'TECHNICAL';
                const owner = isOwned(ws);

                return (
                  <DropdownMenuItem
                    key={ws.id}
                    onClick={() => handleSelectWorkspace(ws)}
                    className={cn(
                      'flex items-center justify-between gap-2 py-2 px-3',
                      isSelected && 'bg-sand font-semibold'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isTech ? (
                        <CodeBoldIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
                      ) : (
                        <BookLinearIcon className="h-3.5 w-3.5 shrink-0 text-text/60" />
                      )}
                      <span className="truncate text-xs text-text">{ws.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.2 font-mono text-[9px] font-semibold border',
                          owner
                            ? 'bg-accent/10 border-accent/30 text-accent'
                            : 'bg-sand border-sep-line text-text/70'
                        )}
                      >
                        {owner ? 'Owner' : 'Shared'}
                      </span>

                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                      )}
                    </div>
                  </DropdownMenuItem>
                );
              })
            )}
          </div>

          <DropdownMenuSeparator />

          {/* New Workspace Button at Bottom of Dropdown */}
          <DropdownMenuItem
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 py-2 font-mono text-xs font-semibold text-accent hover:text-accent focus:text-accent"
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            <span>New Workspace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Workspace Modal Dialog */}
      <CreateWorkspaceModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={(created) => {
          if (created?.id) {
            setActiveWorkspaceId(created.id);
            navigate(`/workspaces/${created.id}`);
          }
        }}
      />
    </>
  );
}

export default WorkspaceSelector;
