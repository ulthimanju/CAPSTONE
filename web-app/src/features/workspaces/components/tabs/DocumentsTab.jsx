import React, { useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FileText, Upload, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWorkspaceDocumentsQuery } from '@/features/documents/hooks/useDocuments';
import { useMultiFileUpload } from '@/features/documents/hooks/useMultiFileUpload';
import { DocumentListTable } from '@/features/documents/components/DocumentListTable';
import { getErrorMessage } from '@/lib/errorUtils';

export function DocumentsTab({ workspace: propWorkspace }) {
  const context = useOutletContext() || {};
  const workspace = propWorkspace || context.workspace;
  const fileInputRef = useRef(null);

  const {
    data: documentsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useWorkspaceDocumentsQuery(workspace?.id);

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
      {/* Hidden Multi-File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.docx,.wps,.pptx,.key,.xlsx,.csv,.png,.jpg,.jpeg,.tif,.tiff"
        onChange={handleFileChange}
      />

      {/* Header row */}
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-lg font-bold text-text">
          Workspace Documents ({documents.length})
        </h2>
        <p className="font-body text-xs text-text/70">
          Source documents parsed into vector embeddings for contextual AI tutoring.
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <Card className="flex flex-col items-center justify-center border-danger/30 bg-danger-tint p-8 text-center">
          <AlertCircle className="h-8 w-8 text-danger" aria-hidden="true" />
          <h3 className="mt-3 font-display text-base font-bold text-danger">
            Unable to load documents
          </h3>
          <p className="mt-1 max-w-sm font-body text-xs text-text/80 leading-relaxed">
            {getErrorMessage(error, 'Failed to fetch documents for this workspace.')}
          </p>
          <Button
            onClick={() => refetch()}
            variant="outline"
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            className="mt-4 text-xs"
          >
            Try Again
          </Button>
        </Card>
      )}

      {/* Document List Table */}
      {!isLoading && !isError && documents.length > 0 && (
        <DocumentListTable workspaceId={workspace.id} documents={documents} />
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
            Upload PDF textbooks, lecture slides (PPTX), Word documents, or spreadsheets to initialize AI search and study units.
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            isLoading={isUploading}
            leftIcon={<Upload className="h-4 w-4" />}
            className="mt-5 text-xs"
          >
            {isUploading ? 'Uploading...' : 'Upload First Documents'}
          </Button>
        </Card>
      )}
    </div>
  );
}

export default DocumentsTab;

