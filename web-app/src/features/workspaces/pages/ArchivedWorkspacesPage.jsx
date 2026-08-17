import React from 'react';
import { Link } from 'react-router-dom';
import { Archive, ArrowCounterClockwise, ArrowRight, Clock, ShieldWarning } from '@/components/ui/icons';
import { useArchivedWorkspacesQuery, useRestoreWorkspaceMutation } from '../hooks/useWorkspaces';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errorUtils';

export function ArchivedWorkspacesPage() {
  const { data, isLoading, error } = useArchivedWorkspacesQuery({ limit: 100 });

  const restoreMutation = useRestoreWorkspaceMutation({
    onSuccess: (_, workspaceId) => {
      toast.success('Workspace restored to active list');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to restore workspace'));
    },
  });

  const rawList = data?.workspaces || (Array.isArray(data) ? data : []);
  const archivedWorkspaces = rawList;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="border-b border-sep-line pb-5">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-xl font-bold text-text">Archived Workspaces</h1>
          {archivedWorkspaces.length > 0 && (
            <span className="rounded-full bg-sand px-2 py-0.5 font-mono text-[11px] font-bold text-accent border border-sep-line">
              {archivedWorkspaces.length} archived
            </span>
          )}
        </div>
        <p className="mt-1 font-body text-xs text-text/70">
          Workspaces that have been archived. Their documents and past data are preserved in read-only state.
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-16 text-center text-xs font-mono text-text/60">
          Loading archived workspaces...
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <Card className="p-6 border-sep-line bg-surface text-center">
          <ShieldWarning className="mx-auto h-8 w-8 text-accent mb-2" />
          <p className="text-xs text-text/80">Failed to load archived workspaces.</p>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && archivedWorkspaces.length === 0 && (
        <Card className="flex flex-col items-center justify-center border-dashed border-sep-line py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-ui border border-sep-line bg-sand text-accent">
            <Archive className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-3 font-display text-base font-bold text-text">
            No archived workspaces
          </h3>
          <p className="mt-1 max-w-sm font-body text-xs text-text/70 leading-relaxed">
            When a workspace is no longer active, you can archive it from workspace Gear to keep it organized here.
          </p>
          <Link to="/workspaces" className="mt-5">
            <Button size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />} className="text-xs">
              View Active Workspaces
            </Button>
          </Link>
        </Card>
      )}

      {/* Archived Workspaces Grid */}
      {!isLoading && archivedWorkspaces.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {archivedWorkspaces.map((workspace) => (
            <Card
              key={workspace.id}
              className="p-5 border border-sep-line bg-surface flex flex-col justify-between hover:border-accent shadow-xs transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded bg-sand px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent border border-sep-line/60 uppercase">
                    {workspace.domain_type || 'GENERAL'}
                  </span>
                </div>

                <h3 className="mt-3 font-display text-sm font-bold text-text line-clamp-1">
                  {workspace.name}
                </h3>
                {workspace.description && (
                  <p className="mt-1 font-body text-xs text-text/70 line-clamp-2">
                    {workspace.description}
                  </p>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-sep-line flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-text/50">
                  <Clock className="h-3 w-3" />
                  <span>
                    ARCHIVED ON {workspace.archived_at
                      ? new Date(workspace.archived_at).toLocaleDateString()
                      : new Date(workspace.updated_at).toLocaleDateString()}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => restoreMutation.mutate(workspace.id)}
                  isLoading={restoreMutation.isPending}
                  leftIcon={<ArrowCounterClockwise className="h-3 w-3" />}
                  className="text-xs px-2.5 py-1"
                >
                  Restore
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default ArchivedWorkspacesPage;
