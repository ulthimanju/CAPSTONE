import React, { useState, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, Upload, Sparkles, RotateCcw, UserPlus, ArrowLeft } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { WorkspaceSelector } from '@/features/workspaces/components/WorkspaceSelector';
import { useMultiFileUpload } from '@/features/documents/hooks/useMultiFileUpload';
import { useUploadQueueStore } from '@/store/uploadQueueStore';
import { useWorkspaceQuery } from '@/features/workspaces/hooks/useWorkspaces';
import { useGenerateSummaryMutation } from '@/features/summary/hooks/useSummary';
import {
  useWorkspaceChatQuery,
  useSaveWorkspaceChatMutation,
} from '@/features/chat/hooks/useChat';
import {
  useWorkspaceLearningPathQuery,
  useGenerateLearningPathMutation,
  useGenerateUnitContentMutation,
  useLearningPathStore,
} from '@/features/learning-path/hooks/useLearningPath';
import { InviteCollaboratorModal } from '@/features/workspaces/components/InviteCollaboratorModal';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { toast } from 'sonner';

export function Header({ title, children, className }) {
  const location = useLocation();
  const toggleMobileSidebar = useUIStore((state) => state.toggleMobileSidebar);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const currentUser = useAuthStore((state) => state.user);
  const fileInputRef = useRef(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const { data: workspace } = useWorkspaceQuery(activeWorkspaceId);
  const isOwner = workspace?.user_role === 'OWNER' || workspace?.owner_id === currentUser?.id;
  const generateSummaryMutation = useGenerateSummaryMutation(activeWorkspaceId);

  const { data: chatData } = useWorkspaceChatQuery(activeWorkspaceId);
  const saveChatMutation = useSaveWorkspaceChatMutation(activeWorkspaceId);

  const { data: learningPath } = useWorkspaceLearningPathQuery(activeWorkspaceId);
  const generateLearningPathMutation = useGenerateLearningPathMutation(activeWorkspaceId);
  const isGeneratingPath = useLearningPathStore((state) =>
    Boolean(state.generatingWorkspaces[activeWorkspaceId])
  );

  const isLearningUnitDetailPage =
    location.pathname.includes('/learning-path/') &&
    location.pathname.split('/learning-path/')[1]?.length > 0;

  const unitTitleParam = isLearningUnitDetailPage
    ? decodeURIComponent(location.pathname.split('/learning-path/')[1].split('?')[0])
    : null;

  const generateUnitMutation = useGenerateUnitContentMutation(
    activeWorkspaceId,
    unitTitleParam
  );

  const isGeneratingUnit = useLearningPathStore((state) =>
    unitTitleParam ? Boolean(state.generatingUnits[`${activeWorkspaceId}:${unitTitleParam}`]) : false
  );

  const { uploadFiles } = useMultiFileUpload(activeWorkspaceId);
  const queueItems = useUploadQueueStore((state) => state.items);
  const isUploading = queueItems.some(
    (i) => i.status === 'UPLOADING' || i.status === 'QUEUED' || i.status === 'PROCESSING'
  );

  const isSummaryTab =
    location.pathname.endsWith('/summary') || location.pathname.includes('/summary');

  const isChatTab =
    location.pathname.endsWith('/chat') || location.pathname.includes('/chat');

  const isLearningPathTab =
    !isLearningUnitDetailPage &&
    (location.pathname.endsWith('/learning-path') || location.pathname.includes('/learning-path'));

  const isCollaboratorsTab =
    location.pathname.endsWith('/collaborators') || location.pathname.includes('/collaborators');

  const isSummaryGenerated = Boolean(
    workspace?.is_summary_generated || workspace?.summary_json
  );

  const hasChatMessages = Boolean(
    chatData?.messages && chatData.messages.length > 0
  );

  const hasLearningPath = Boolean(
    learningPath?.units && Array.isArray(learningPath.units) && learningPath.units.length > 0
  );

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerateSummary = () => {
    if (activeWorkspaceId) {
      generateSummaryMutation.mutate(undefined, {
        onSuccess: () => {
          toast.success('Workspace summary generation started with Gemini 2.5 Flash.');
        },
      });
    }
  };

  const handleGenerateLearningPath = () => {
    if (activeWorkspaceId) {
      generateLearningPathMutation.mutate(undefined, {
        onSuccess: () => {
          toast.success('Learning path generation started with Gemini 2.5 Flash.');
        },
      });
    }
  };

  const handleRegenerateUnitContent = () => {
    if (activeWorkspaceId && unitTitleParam) {
      generateUnitMutation.mutate(
        { unit_title: unitTitleParam },
        {
          onSuccess: () => {
            toast.success('Unit content synthesis started with Gemini 2.5 Flash.');
          },
          onError: (err) => {
            toast.error(err?.message || 'Failed to regenerate unit content.');
          },
        }
      );
    }
  };

  const handleClearChat = () => {
    if (activeWorkspaceId) {
      saveChatMutation.mutate([], {
        onSuccess: () => {
          toast.success('Chat history cleared');
        },
      });
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-sep-line bg-bg px-4 transition-colors sm:px-6',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-ui border border-sep-line bg-surface-raised text-text transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* On Learning Unit Content Page: Hide Workspace Dropdown, Show "Back to Learning Path" button */}
        {isLearningUnitDetailPage ? (
          <div className="flex items-center gap-3">
            <Link
              to={`/workspaces/${activeWorkspaceId}/learning-path`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-ui border border-sep-line bg-surface-raised font-mono text-xs font-medium text-text hover:text-accent hover:border-accent transition-colors shadow-2xs"
              title="Back to Learning Path"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Learning Path</span>
            </Link>
            {unitTitleParam && (
              <h2 className="font-display text-sm font-bold text-text hidden sm:block max-w-xs truncate" title={unitTitleParam}>
                {unitTitleParam}
              </h2>
            )}
          </div>
        ) : (
          /* Workspace Selector Dropdown in Main Header */
          <WorkspaceSelector />
        )}

        {title && !isLearningUnitDetailPage && (
          <h1 className="font-display text-lg font-semibold tracking-tight text-text sm:text-xl hidden md:block">
            {title}
          </h1>
        )}
      </div>

      {/* Main Header Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {activeWorkspaceId && (
          <>
            {/* Generate / Regenerate Summary Button - Visible ONLY on Summary Tab */}
            {isSummaryTab && (
              <Button
                variant="outline"
                onClick={handleGenerateSummary}
                isLoading={generateSummaryMutation.isPending}
                leftIcon={<Sparkles className="h-4 w-4 text-accent" />}
                className="text-xs py-1.5 px-3 border-accent/30 hover:border-accent"
                title={
                  isSummaryGenerated
                    ? 'Regenerate complete workspace summary with Gemini 2.5 Flash'
                    : 'Generate complete workspace summary with Gemini 2.5 Flash'
                }
              >
                {generateSummaryMutation.isPending
                  ? 'Synthesizing...'
                  : isSummaryGenerated
                  ? 'Regenerate Summary'
                  : 'Generate Summary'}
              </Button>
            )}

            {/* Generate / Regenerate Learning Path Button - Visible ONLY on Learning Path Tab */}
            {isLearningPathTab && (
              <Button
                variant="outline"
                onClick={handleGenerateLearningPath}
                isLoading={generateLearningPathMutation.isPending || isGeneratingPath}
                leftIcon={<Sparkles className="h-4 w-4 text-accent" />}
                className="text-xs py-1.5 px-3 border-accent/30 hover:border-accent"
                title={
                  hasLearningPath
                    ? 'Regenerate complete learning path curriculum with Gemini 2.5 Flash'
                    : 'Generate complete learning path curriculum with Gemini 2.5 Flash'
                }
              >
                {generateLearningPathMutation.isPending || isGeneratingPath
                  ? 'Synthesizing...'
                  : hasLearningPath
                  ? 'Regenerate Path'
                  : 'Generate Path'}
              </Button>
            )}

            {/* Regenerate Unit Content Button - Visible ONLY on Learning Unit Detail Page */}
            {isLearningUnitDetailPage && (
              <Button
                variant="outline"
                onClick={handleRegenerateUnitContent}
                isLoading={generateUnitMutation.isPending || isGeneratingUnit}
                leftIcon={<Sparkles className="h-4 w-4 text-accent" />}
                className="text-xs py-1.5 px-3 border-accent/30 hover:border-accent"
                title="Regenerate this unit's complete study bundle with Gemini 2.5 Flash"
              >
                {generateUnitMutation.isPending || isGeneratingUnit
                  ? 'Synthesizing...'
                  : 'Regenerate Content'}
              </Button>
            )}

            {/* Clear Chat History Button - Visible ONLY on Chat / AI Tutor Tab */}
            {isChatTab && hasChatMessages && (
              <Button
                variant="outline"
                onClick={handleClearChat}
                isLoading={saveChatMutation.isPending}
                leftIcon={<RotateCcw className="h-4 w-4 text-text/70" />}
                className="text-xs py-1.5 px-3 border-sep-line hover:border-danger/40 hover:text-danger"
                title="Clear workspace AI Tutor chat history"
              >
                Clear History
              </Button>
            )}

            {/* Invite Collaborators Button (Secondary Outline) - Visible ONLY on Collaborators Tab */}
            {isCollaboratorsTab && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsInviteModalOpen(true)}
                  leftIcon={<UserPlus className="h-4 w-4 text-text/70" />}
                  className="text-xs py-1.5 px-3 border-sep-line hover:border-accent hover:text-accent"
                  title="Invite collaborators to this workspace"
                >
                  Invite Collaborators
                </Button>

                <InviteCollaboratorModal
                  workspaceId={activeWorkspaceId}
                  open={isInviteModalOpen}
                  onOpenChange={setIsInviteModalOpen}
                  isOwner={isOwner}
                />
              </>
            )}

            {/* Hidden Multi-File Picker Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.docx,.wps,.pptx,.key,.xlsx,.csv,.png,.jpg,.jpeg,.tif,.tiff"
              onChange={handleFileChange}
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              isLoading={isUploading}
              leftIcon={<Upload className="h-4 w-4" />}
              className="text-xs py-1.5 px-3"
            >
              {isUploading ? 'Uploading...' : 'Upload Documents'}
            </Button>
          </>
        )}
        {children}
      </div>
    </header>
  );
}

export default Header;
