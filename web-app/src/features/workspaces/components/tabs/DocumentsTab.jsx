import React, { useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FileText, Upload, CircleNotch, WarningCircle, Shield } from '@/components/ui/icons';
import { Card, Button, RegenerateIcon } from '@/components/ui';
import { useWorkspaceDocumentsQuery } from '@/features/documents/hooks/useDocuments';
import { useMultiFileUpload } from '@/features/documents/hooks/useMultiFileUpload';
import { useGoogleDriveStatusQuery } from '@/features/auth/hooks/useAuth';
import { useWorkspacePermissions } from '@/features/workspaces/hooks/useWorkspacePermissions';
import { DocumentListTable } from '@/features/documents/components/DocumentListTable';
import { getErrorMessage } from '@/lib/errorUtils';

export function DocumentsTab({ workspace: propWorkspace }) {
  const context = useOutletContext() || {};
  const workspace = propWorkspace || context.workspace;
  const fileInputRef = useRef(null);
  const { isOwner } = useWorkspacePermissions(workspace);

  const {
    data: documentsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useWorkspaceDocumentsQuery(workspace?.id);

  const { data: driveStatusData } = useGoogleDriveStatusQuery();
  const isDriveLinked = Boolean(driveStatusData?.isLinked);

  const { uploadFiles, isUploading } = useMultiFileUpload(workspace?.id);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const documents = Array.isArray(documentsData?.documents)
    ? documentsData.documents
    : Array.isArray(documentsData)
    ? documentsData
    : [];

  if (!workspace) return null;

  return (
    <div className="space-y-6">
      {/* Hidden Multi-File Input (Only active for Owner) */}
      {isOwner && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.docx,.wps,.pptx,.key,.xlsx,.csv,.png,.jpg,.jpeg,.tif,.tiff"
          onChange={handleFileChange}
        />
      )}

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-lg font-bold text-text">
            Workspace Documents ({documents.length})
          </h2>
          <p className="font-body text-xs text-text/70">
            Source documents parsed into vector embeddings for contextual AI tutoring.
          </p>
        </div>

        {/* Upload More Button (Owner Only) */}
        {isOwner && documents.length > 0 && (
          <div className="relative inline-block group" title={!isDriveLinked ? 'Connect Drive to Upload' : undefined}>
            <Button
              onClick={() => {
                if (isDriveLinked) {
                  fileInputRef.current?.click();
                }
              }}
              disabled={!isDriveLinked || isUploading}
              isLoading={isUploading}
              leftIcon={<Upload className="h-4 w-4" />}
              className="text-xs"
            >
              {isUploading ? 'Uploading...' : 'Upload Documents'}
            </Button>
            {!isDriveLinked && (
              <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden group-hover:flex items-center gap-1.5 whitespace-nowrap rounded-ui bg-sand px-2.5 py-1 text-[11px] font-medium text-text shadow-xs z-50 border border-sep-line animate-in fade-in duration-150">
                <span>Connect Drive to Upload</span>
                <div className="absolute top-full right-4 border-4 border-transparent border-t-sand" />
              </div>
            )}
          </div>
        )}

        {!isOwner && (
          <div className="inline-flex items-center gap-1.5 rounded-ui bg-sand/60 px-3 py-1.5 font-mono text-[11px] text-text/70 border border-sep-line">
            <Shield className="h-3.5 w-3.5 text-accent" />
            <span>Document uploads managed by owner</span>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <CircleNotch className="h-8 w-8 animate-spin text-accent" />
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <Card className="flex flex-col items-center justify-center border-danger/30 bg-danger-tint p-8 text-center">
          <WarningCircle className="h-8 w-8 text-danger" aria-hidden="true" />
          <h3 className="mt-3 font-display text-base font-bold text-danger">
            Unable to load documents
          </h3>
          <p className="mt-1 max-w-sm font-body text-xs text-text/80 leading-relaxed">
            {getErrorMessage(error, 'Failed to fetch documents for this workspace.')}
          </p>
          <Button
            onClick={() => refetch()}
            variant="outline"
            leftIcon={<RegenerateIcon className="h-3.5 w-3.5" />}
            className="mt-4 text-xs"
          >
            Try Again
          </Button>
        </Card>
      )}

      {/* Document List Table */}
      {!isLoading && !isError && documents.length > 0 && (
        <DocumentListTable workspaceId={workspace.id} documents={documents} isOwner={isOwner} />
      )}

      {/* Empty Documents State */}
      {!isLoading && !isError && documents.length === 0 && (
        <Card className="flex flex-col items-center justify-center border-dashed border-sep-line py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-ui border border-sep-line bg-sand text-accent">
            <FileText className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-3 font-display text-base font-bold text-text">
            No documents attached yet
          </h3>
          <p className="mt-1 max-w-sm font-body text-xs text-text/70 leading-relaxed">
            {isOwner
              ? 'Upload PDF textbooks, lecture slides (PPTX), Word documents, or spreadsheets to initialize AI tutoring and study units.'
              : 'The workspace owner has not attached any study documents yet.'}
          </p>
          {isOwner ? (
            <div className="relative inline-block group mt-5" title={!isDriveLinked ? 'Connect Drive to Upload' : undefined}>
              <Button
                onClick={() => {
                  if (isDriveLinked) {
                    fileInputRef.current?.click();
                  }
                }}
                disabled={!isDriveLinked || isUploading}
                isLoading={isUploading}
                leftIcon={<Upload className="h-4 w-4" />}
                className="text-xs"
              >
                {isUploading ? 'Uploading...' : 'Upload First Documents'}
              </Button>
              {!isDriveLinked && (
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex items-center gap-1.5 whitespace-nowrap rounded-ui bg-sand px-2.5 py-1 text-[11px] font-medium text-text shadow-xs z-50 border border-sep-line animate-in fade-in duration-150">
                  <span>Connect Drive to Upload</span>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-sand" />
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-ui bg-sand/60 px-3 py-1.5 font-mono text-[11px] text-text/70 border border-sep-line">
              <Shield className="h-3.5 w-3.5 text-accent" />
              <span>Only the workspace owner can upload documents</span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default DocumentsTab;

