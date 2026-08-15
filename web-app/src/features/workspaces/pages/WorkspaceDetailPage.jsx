import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle, BookOpen, FileText, Users, Settings, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { WorkspaceHeader } from '../components/WorkspaceHeader';
import { OverviewTab } from '../components/tabs/OverviewTab';
import { DocumentsTab } from '../components/tabs/DocumentsTab';
import { CollaboratorsTab } from '../components/tabs/CollaboratorsTab';
import { SettingsTab } from '../components/tabs/SettingsTab';
import { InviteCollaboratorModal } from '../components/InviteCollaboratorModal';
import { useWorkspaceQuery } from '../hooks/useWorkspaces';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { ROUTES } from '@/config/constants';

export function WorkspaceDetailPage() {
  const { workspaceId } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

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

  return (
    <div>
      {/* Workspace Header */}
      <WorkspaceHeader
        workspace={workspace}
        onInviteClick={() => setIsInviteModalOpen(true)}
      />

      {/* Tabs Container */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Overview</span>
            </TabsTrigger>

            <TabsTrigger value="documents">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Documents</span>
            </TabsTrigger>

            <TabsTrigger value="collaborators">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Collaborators</span>
            </TabsTrigger>

            <TabsTrigger value="settings">
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab workspace={workspace} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab workspace={workspace} />
          </TabsContent>

          <TabsContent value="collaborators">
            <CollaboratorsTab workspace={workspace} />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab workspace={workspace} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite Collaborator Dialog */}
      <InviteCollaboratorModal
        workspaceId={workspace.id}
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
      />
    </div>
  );
}

export default WorkspaceDetailPage;
