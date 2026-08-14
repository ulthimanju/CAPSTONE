/**
 * DocumentsSection — UI Composition Layer
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useDocumentsSection } from './DocumentsSection.logic';
import { DocumentsSectionLayout } from './DocumentsSection.layout';

export function DocumentsSection({ workspaceId: propWorkspaceId }) {
  const { workspaceId: paramWorkspaceId } = useParams();
  const workspaceId = propWorkspaceId || paramWorkspaceId;

  const {
    documentsData,
    isLoading,
    isUploading,
    error,
    uploadFile,
    deleteDocument,
  } = useDocumentsSection(workspaceId);

  return (
    <DocumentsSectionLayout
      workspaceId={workspaceId}
      documentsData={documentsData}
      isLoading={isLoading}
      isUploading={isUploading}
      error={error}
      onUploadFile={uploadFile}
      onDeleteDocument={deleteDocument}
    />
  );
}
