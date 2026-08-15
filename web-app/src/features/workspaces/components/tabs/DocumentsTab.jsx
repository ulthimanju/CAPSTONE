import React, { useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FileText, Upload, Loader2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  useWorkspaceDocumentsQuery,
  useUploadDocumentMutation,
} from '@/features/documents/hooks/useDocuments';
import { DocumentListTable } from '@/features/documents/components/DocumentListTable';

const ALLOWED_EXTENSIONS = [
  'pdf', 'docx', 'wps', 'pptx', 'key', 'xlsx', 'csv', 'png', 'jpg', 'jpeg', 'tif', 'tiff'
];
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'tif', 'tiff'];

export function DocumentsTab({ workspace: propWorkspace }) {
  const context = useOutletContext() || {};
  const workspace = propWorkspace || context.workspace;
  const fileInputRef = useRef(null);
  const [uploadError, setUploadError] = useState(null);

  const {
    data: documentsData,
    isLoading,
    isError,
  } = useWorkspaceDocumentsQuery(workspace?.id);

  const uploadMutation = useUploadDocumentMutation(workspace?.id, {
    onSuccess: () => {
      setUploadError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err) => {
      setUploadError(err?.response?.data?.detail || err?.message || 'Failed to upload document.');
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      return;
    }

    uploadMutation.mutate({ file });
  };

  const documents = documentsData?.documents || [];

  if (!workspace) return null;

  return (
    <div className="space-y-6">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
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

      {uploadError && (
        <div className="flex items-center gap-2 rounded-ui border border-danger/40 bg-danger-tint p-3 font-mono text-xs text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
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
            isLoading={uploadMutation.isPending}
            leftIcon={<Upload className="h-4 w-4" />}
            className="mt-5 text-xs"
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload First Document'}
          </Button>
        </Card>
      )}
    </div>
  );
}

export default DocumentsTab;
