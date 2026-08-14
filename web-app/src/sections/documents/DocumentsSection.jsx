/**
 * DocumentsSection — UI Composition Layer
 */

import React, { useRef } from 'react';
import { useDocumentsSection } from './DocumentsSection.logic';
import { DocumentsSectionLayout } from './DocumentsSection.layout';
import { Button } from '@/components/ui/Button';

import { CopyPayloadButton } from '@/components/ui/CopyPayloadButton';

export function DocumentsHeaderActions({ workspaceId }) {
  const { documentsData, isLoading, isUploading, refetch, uploadFile } = useDocumentsSection(workspaceId);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
      e.target.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <CopyPayloadButton payload={documentsData} />
      <Button variant="secondary" size="sm" onClick={refetch} disabled={isLoading || isUploading}>
        Refetch List
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        loading={isUploading}
        disabled={isLoading}
      >
        Upload Document
      </Button>
    </div>
  );
}

export function DocumentsSection({ workspaceId }) {
  const {
    documentsData,
    isLoading,
    isUploading,
    error,
    refetch,
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
      onRefetch={refetch}
      onUploadFile={uploadFile}
      onDeleteDocument={deleteDocument}
    />
  );
}
