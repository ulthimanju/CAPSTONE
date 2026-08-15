import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FileText, Upload, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWorkspaceDocumentsQuery } from '@/features/documents/hooks/useDocuments';
import { UploadDocumentModal } from '@/features/documents/components/UploadDocumentModal';
import { DocumentListTable } from '@/features/documents/components/DocumentListTable';

export function DocumentsTab({ workspace: propWorkspace }) {
  const context = useOutletContext() || {};
  const workspace = propWorkspace || context.workspace;

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const {
    data: documentsData,
    isLoading,
    isError,
  } = useWorkspaceDocumentsQuery(workspace?.id);

  const documents = documentsData?.documents || [];

  if (!workspace) return null;

  return (
    <div className="space-y-6">
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
            onClick={() => setIsUploadModalOpen(true)}
            leftIcon={<Upload className="h-4 w-4" />}
            className="mt-5 text-xs"
          >
            Upload First Document
          </Button>
        </Card>
      )}

      {/* Upload Document Modal */}
      <UploadDocumentModal
        workspaceId={workspace.id}
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
      />
    </div>
  );
}

export default DocumentsTab;
