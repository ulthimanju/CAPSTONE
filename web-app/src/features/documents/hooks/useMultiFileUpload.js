import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { documentApi } from '../api/documentApi';
import { DOCUMENT_QUERY_KEYS } from './useDocuments';
import { workspaceKeys } from '@/features/workspaces/hooks/workspaceKeys';
import { getErrorMessage } from '@/lib/errorUtils';
import { ALLOWED_DOCUMENT_EXTENSIONS as ALLOWED_EXTENSIONS, IMAGE_EXTENSIONS } from '@/utils/files';

export function useMultiFileUpload(workspaceId) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const uploadFiles = async (fileList) => {
    if (!workspaceId || !fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);
    const validUploadTasks = [];

    for (const file of filesArray) {
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
        toast.error(`"${file.name}": Unsupported file format.`);
        continue;
      }

      const isImage = IMAGE_EXTENSIONS.includes(ext);
      const maxBytes = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;

      if (file.size > maxBytes) {
        toast.error(
          `"${file.name}": ${isImage ? 'Image exceeds 10 MB limit.' : 'File exceeds 50 MB limit.'}`
        );
        continue;
      }

      validUploadTasks.push(file);
    }

    if (validUploadTasks.length === 0) return;

    setIsUploading(true);

    const optimisticDocs = validUploadTasks.map((file) => {
      const ext = (file.name.split('.').pop() || 'FILE').toUpperCase();
      return {
        id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        workspace_id: workspaceId,
        original_filename: file.name,
        file_size_bytes: file.size,
        file_extension: ext,
        mime_type: file.type || 'application/octet-stream',
        status: 'UPLOADING',
        parse_status: 'UPLOADING',
        is_split: false,
        part_count: 1,
        chunk_count: 0,
        created_at: new Date().toISOString(),
        is_optimistic: true,
      };
    });

    // Optimistically insert items immediately into document list cache
    queryClient.setQueryData(DOCUMENT_QUERY_KEYS.workspaceList(workspaceId), (old) => {
      const existing = Array.isArray(old?.documents)
        ? old.documents
        : Array.isArray(old)
        ? old
        : [];
      if (Array.isArray(old)) {
        return [...optimisticDocs, ...existing];
      }
      return {
        ...(typeof old === 'object' && old !== null ? old : {}),
        documents: [...optimisticDocs, ...existing],
      };
    });

    try {
      let successCount = 0;
      for (const file of validUploadTasks) {
        try {
          await documentApi.uploadDocumentFile({
            workspaceId,
            file,
          });
          successCount += 1;
        } catch (err) {
          const msg = getErrorMessage(err, `Failed to upload "${file.name}" to Google Drive.`);
          toast.error(msg, { duration: 6000 });
        }
      }

      // Synchronously invalidate and refetch workspace documents
      await queryClient.invalidateQueries({ queryKey: DOCUMENT_QUERY_KEYS.workspaceList(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });

      if (successCount === validUploadTasks.length) {
        toast.success(
          successCount === 1
            ? 'Document uploaded successfully'
            : `${successCount} documents uploaded successfully`
        );
      } else if (successCount > 0) {
        toast.warning(
          `${successCount} of ${validUploadTasks.length} documents uploaded.`
        );
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Upload failed. Please try again.'), { duration: 6000 });
      queryClient.invalidateQueries({ queryKey: DOCUMENT_QUERY_KEYS.workspaceList(workspaceId) });
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFiles, isUploading };
}

export default useMultiFileUpload;
