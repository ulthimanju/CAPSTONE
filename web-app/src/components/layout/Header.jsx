import React, { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Upload, Sparkles } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { WorkspaceSelector } from '@/features/workspaces/components/WorkspaceSelector';
import { useMultiFileUpload } from '@/features/documents/hooks/useMultiFileUpload';
import { useUploadQueueStore } from '@/store/uploadQueueStore';
import { useWorkspaceQuery } from '@/features/workspaces/hooks/useWorkspaces';
import { useGenerateSummaryMutation } from '@/features/summary/hooks/useSummary';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export function Header({ title, children, className }) {
  const location = useLocation();
  const toggleMobileSidebar = useUIStore((state) => state.toggleMobileSidebar);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const fileInputRef = useRef(null);

  const { data: workspace } = useWorkspaceQuery(activeWorkspaceId);
  const generateSummaryMutation = useGenerateSummaryMutation(activeWorkspaceId);

  const { uploadFiles } = useMultiFileUpload(activeWorkspaceId);
  const queueItems = useUploadQueueStore((state) => state.items);
  const isUploading = queueItems.some(
    (i) => i.status === 'UPLOADING' || i.status === 'QUEUED' || i.status === 'PROCESSING'
  );

  const isSummaryTab =
    location.pathname.endsWith('/summary') || location.pathname.includes('/summary');

  const isSummaryGenerated = Boolean(
    workspace?.is_summary_generated || workspace?.summary_json
  );

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerateSummary = () => {
    if (activeWorkspaceId) {
      generateSummaryMutation.mutate();
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-sep-line bg-bg/95 px-4 backdrop-blur transition-colors sm:px-6',
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

        {/* Workspace Selector Dropdown in Main Header */}
        <WorkspaceSelector />

        {title && (
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
