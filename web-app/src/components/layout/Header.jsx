import React, { useState } from 'react';
import { Menu, Upload } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { WorkspaceSelector } from '@/features/workspaces/components/WorkspaceSelector';
import { UploadDocumentModal } from '@/features/documents/components/UploadDocumentModal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export function Header({ title, children, className }) {
  const toggleMobileSidebar = useUIStore((state) => state.toggleMobileSidebar);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

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
      <div className="flex items-center gap-2 sm:gap-4">
        {activeWorkspaceId && (
          <>
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              leftIcon={<Upload className="h-4 w-4" />}
              className="text-xs py-1.5 px-3"
            >
              Upload Document
            </Button>

            <UploadDocumentModal
              workspaceId={activeWorkspaceId}
              open={isUploadModalOpen}
              onOpenChange={setIsUploadModalOpen}
            />
          </>
        )}
        {children}
      </div>
    </header>
  );
}

export default Header;
