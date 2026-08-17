import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, FolderPlus, AlertCircle } from 'lucide-react';
import { Button, Card, PlusIcon } from '@/components/ui';
import { CreateWorkspaceModal } from '../components/CreateWorkspaceModal';
import { useWorkspacesQuery } from '../hooks/useWorkspaces';
import { useWorkspaceStore } from '@/store/workspaceStore';

export function WorkspacesPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data, isLoading, isError, error, refetch } = useWorkspacesQuery();
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const clearActiveWorkspace = useWorkspaceStore((state) => state.clearActiveWorkspace);

  const workspaces = data?.workspaces || [];

  useEffect(() => {
    if (!isLoading && workspaces.length === 0 && activeWorkspaceId) {
      clearActiveWorkspace();
    }
  }, [isLoading, workspaces.length, activeWorkspaceId, clearActiveWorkspace]);

  // If workspaces exist, redirect directly to active workspace or the first workspace detail view
  if (!isLoading && !isError && workspaces.length > 0) {
    const targetId = activeWorkspaceId && workspaces.some((w) => w.id === activeWorkspaceId)
      ? activeWorkspaceId
      : workspaces[0].id;

    return <Navigate to={`/workspaces/${targetId}`} replace />;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
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
            Create your first workspace using the header selector or click below to start collaborative course study, document parsing, and AI tutoring.
          </p>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<PlusIcon className="h-4 w-4" />}
            className="mt-5"
          >
            Create Workspace
          </Button>
        </Card>
      )}

      {/* Create Workspace Modal Dialog */}
      <CreateWorkspaceModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}

export default WorkspacesPage;
