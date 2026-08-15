import React, { useEffect } from 'react';
import { useParams, useLocation, Link, Outlet } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWorkspaceQuery } from '../hooks/useWorkspaces';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { ROUTES } from '@/config/constants';

export function WorkspaceDetailPage() {
  const { workspaceId } = useParams();
  const location = useLocation();
  const setActiveWorkspaceId = useWorkspaceStore((state) => state.setActiveWorkspaceId);

  const {
    data: workspace,
    isLoading,
    isError,
    error,
  } = useWorkspaceQuery(workspaceId);

  useEffect(() => {
    if (workspace?.id) {
      setActiveWorkspaceId(workspace.id);
    }
  }, [workspace?.id, setActiveWorkspaceId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden="true" />
        <p className="mt-3 font-mono text-xs text-text/70">
          Loading workspace details...
        </p>
      </div>
    );
  }

  if (isError || !workspace) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card className="flex flex-col items-center justify-center border-danger/30 bg-danger-tint p-8 text-center">
          <AlertCircle className="h-8 w-8 text-danger" aria-hidden="true" />
          <h2 className="mt-3 font-display text-lg font-bold text-danger">
            Workspace Not Found
          </h2>
          <p className="mt-1 font-mono text-xs text-text/80 leading-relaxed">
            {error?.message || 'The requested workspace could not be found or you do not have permission to view it.'}
          </p>
          <Link to={ROUTES.WORKSPACES} className="mt-5">
            <Button leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Workspaces
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const isChatTab = location.pathname.endsWith('/chat') || location.pathname.includes('/chat');
  const isLearningUnitDetailPage =
    location.pathname.includes('/learning-path/') &&
    location.pathname.split('/learning-path/')[1]?.length > 0;

  if (isChatTab) {
    return (
      <div className="h-[calc(100vh-4rem)] w-full flex flex-col min-h-0">
        <Outlet context={{ workspace }} />
      </div>
    );
  }

  if (isLearningUnitDetailPage) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col">
        <Outlet context={{ workspace }} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Workspace Outlet Content (Overview, Documents, Collaborators, Settings) */}
      <Outlet context={{ workspace }} />
    </div>
  );
}

export default WorkspaceDetailPage;
