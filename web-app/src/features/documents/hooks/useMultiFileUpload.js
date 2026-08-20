import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { documentApi } from '../api/documentApi';
import { DOCUMENT_QUERY_KEYS } from './useDocuments';
import { workspaceKeys } from '@/features/workspaces/hooks/workspaceKeys';
import { getErrorMessage } from '@/lib/errorUtils';

const ALLOWED_EXTENSIONS = [
  'pdf', 'docx', 'wps', 'pptx', 'key', 'xlsx', 'csv', 'png', 'jpg', 'jpeg', 'tif', 'tiff'
];
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'tif', 'tiff'];

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
    const toastId = toast.loading(
      validUploadTasks.length === 1
        ? `Uploading ${validUploadTasks[0].name}...`
        : `Uploading ${validUploadTasks.length} documents...`
    );

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
      queryClient.invalidateQueries({ queryKey: DOCUMENT_QUERY_KEYS.workspaceList(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });

      if (successCount === validUploadTasks.length) {
        toast.success(
          successCount === 1
            ? 'Document uploaded to Google Drive successfully'
            : `${successCount} documents uploaded to Google Drive successfully`,
          { id: toastId }
        );
      } else if (successCount > 0) {
        toast.warning(
          `${successCount} of ${validUploadTasks.length} documents uploaded to Google Drive.`,
          { id: toastId }
        );
      } else {
        toast.dismiss(toastId);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Upload failed. Please try again.'), { id: toastId, duration: 6000 });
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFiles, isUploading };
}

export default useMultiFileUpload;
