import React from 'react';
import { Loader2, FolderPlus, Layers, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { WorkspaceCard } from '../components/WorkspaceCard';
import { useWorkspacesQuery } from '../hooks/useWorkspaces';

export function WorkspacesPage() {
  const { data, isLoading, isError, error, refetch } = useWorkspacesQuery();

  const workspaces = data?.workspaces || [];
  const total = data?.total ?? workspaces.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header section */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
            Workspaces
          </h1>
          <p className="mt-1 font-body text-sm text-text/70">
            Access and manage your engineering and collaborative study workspaces.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 rounded-ui border border-sep-line bg-surface-raised px-3 py-1.5 font-mono text-xs text-text/80">
            <Layers className="h-4 w-4 text-accent" aria-hidden="true" />
            <span>{total} {total === 1 ? 'Workspace' : 'Workspaces'}</span>
          </div>
        </div>
      </div>

      <div className="mt-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden="true" />
            <p className="mt-3 font-mono text-xs text-text/70">
              Loading workspaces...
            </p>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <Card className="flex flex-col items-center justify-center p-8 text-center border-danger/30 bg-danger-tint">
            <AlertCircle className="h-8 w-8 text-danger" aria-hidden="true" />
            <h2 className="mt-3 font-display text-base font-bold text-danger">
              Unable to load workspaces
            </h2>
            <p className="mt-1 font-mono text-xs text-text/80">
              {error?.message || 'A network error occurred while connecting to the workspace service.'}
            </p>
            <Button onClick={() => refetch()} className="mt-4">
              Try Again
            </Button>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !isError && workspaces.length === 0 && (
          <Card className="flex flex-col items-center justify-center border-dashed border-sep-line py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-ui border border-sep-line bg-sand text-accent">
              <FolderPlus className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="mt-4 font-display text-lg font-bold text-text">
              No workspaces found
            </h2>
            <p className="mt-1 max-w-sm font-body text-xs text-text/70 leading-relaxed">
              Create or join a workspace to start collaborative course study, document parsing, and AI tutoring.
            </p>
          </Card>
        )}

        {/* Populated Grid */}
        {!isLoading && !isError && workspaces.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {workspaces.map((workspace) => (
              <WorkspaceCard key={workspace.id} workspace={workspace} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkspacesPage;
