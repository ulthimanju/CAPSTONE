import React, { useRef, useState } from 'react';
import { Menu, Upload, AlertCircle } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { WorkspaceSelector } from '@/features/workspaces/components/WorkspaceSelector';
import { useUploadDocumentMutation } from '@/features/documents/hooks/useDocuments';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const ALLOWED_EXTENSIONS = [
  'pdf', 'docx', 'wps', 'pptx', 'key', 'xlsx', 'csv', 'png', 'jpg', 'jpeg', 'tif', 'tiff'
];
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'tif', 'tiff'];

export function Header({ title, children, className }) {
  const toggleMobileSidebar = useUIStore((state) => state.toggleMobileSidebar);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const fileInputRef = useRef(null);
  const [uploadError, setUploadError] = useState(null);

  const uploadMutation = useUploadDocumentMutation(activeWorkspaceId, {
    onSuccess: () => {
      setUploadError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err) => {
      setUploadError(err?.response?.data?.detail || err?.message || 'Failed to upload document.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setUploadError(null), 5000);
    },
  });

  const handleFileChange = (e) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError(
        'Unsupported file format. Supported: PDF, DOCX, WPS, PPTX, KEY, XLSX, CSV, PNG, JPG, TIFF.'
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setUploadError(null), 5000);
      return;
    }

    const isImage = IMAGE_EXTENSIONS.includes(ext);
    const maxBytes = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;

    if (file.size > maxBytes) {
      setUploadError(
        isImage
          ? 'Image file size exceeds maximum allowed limit of 10 MB.'
          : 'Document file size exceeds maximum allowed limit of 50 MB.'
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setUploadError(null), 5000);
      return;
    }

    // Directly trigger multipart upload
    uploadMutation.mutate({ file });
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
      <div className="flex items-center gap-2 sm:gap-4">
        {uploadError && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-ui border border-danger/40 bg-danger-tint px-3 py-1 font-mono text-xs text-danger">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate max-w-xs">{uploadError}</span>
          </div>
        )}

        {activeWorkspaceId && (
          <>
            {/* Hidden File Picker Input */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.wps,.pptx,.key,.xlsx,.csv,.png,.jpg,.jpeg,.tif,.tiff"
              onChange={handleFileChange}
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              isLoading={uploadMutation.isPending}
              leftIcon={<Upload className="h-4 w-4" />}
              className="text-xs py-1.5 px-3"
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
            </Button>
          </>
        )}
        {children}
      </div>
    </header>
  );
}

export default Header;
