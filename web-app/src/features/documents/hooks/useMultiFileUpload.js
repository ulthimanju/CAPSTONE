import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { documentApi } from '../api/documentApi';
import { DOCUMENT_QUERY_KEYS } from './useDocuments';
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
          const msg = getErrorMessage(err, `Failed to upload ${file.name}`);
          toast.error(msg);
        }
      }

      // Synchronously invalidate and refetch workspace documents
      queryClient.invalidateQueries({ queryKey: DOCUMENT_QUERY_KEYS.all });
      queryClient.refetchQueries({ queryKey: DOCUMENT_QUERY_KEYS.workspaceList(workspaceId) });
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId] });

      if (successCount > 0) {
        toast.success(
          successCount === 1
            ? 'Document uploaded successfully'
            : `${successCount} documents uploaded successfully`,
          { id: toastId }
        );
      } else {
        toast.dismiss(toastId);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Upload failed. Please try again.'), { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFiles, isUploading };
}

export default useMultiFileUpload;
