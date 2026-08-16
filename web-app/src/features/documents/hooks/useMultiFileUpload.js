import { useQueryClient } from '@tanstack/react-query';
import { documentApi } from '../api/documentApi';
import { useUploadQueueStore } from '@/store/uploadQueueStore';
import { DOCUMENT_QUERY_KEYS } from './useDocuments';
import { getErrorMessage } from '@/lib/errorUtils';

const ALLOWED_EXTENSIONS = [
  'pdf', 'docx', 'wps', 'pptx', 'key', 'xlsx', 'csv', 'png', 'jpg', 'jpeg', 'tif', 'tiff'
];
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'tif', 'tiff'];

export function useMultiFileUpload(workspaceId) {
  const queryClient = useQueryClient();
  const enqueueFiles = useUploadQueueStore((state) => state.enqueueFiles);
  const updateItemProgress = useUploadQueueStore((state) => state.updateItemProgress);
  const setItemCompleted = useUploadQueueStore((state) => state.setItemCompleted);
  const setItemFailed = useUploadQueueStore((state) => state.setItemFailed);

  const uploadFiles = async (fileList) => {
    if (!workspaceId || !fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);
    const preparedItems = [];
    const validUploadTasks = [];

    filesArray.forEach((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
        preparedItems.push({
          id,
          file,
          name: file.name,
          size: file.size,
          status: 'FAILED',
          error: 'Unsupported file format.',
        });
        return;
      }

      const isImage = IMAGE_EXTENSIONS.includes(ext);
      const maxBytes = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;

      if (file.size > maxBytes) {
        preparedItems.push({
          id,
          file,
          name: file.name,
          size: file.size,
          status: 'FAILED',
          error: isImage ? 'Image exceeds 10 MB limit.' : 'File exceeds 50 MB limit.',
        });
        return;
      }

      preparedItems.push({
        id,
        file,
        name: file.name,
        size: file.size,
        status: 'QUEUED',
      });

      validUploadTasks.push({ id, file });
    });

    // Enqueue all items in the UI queue manager
    enqueueFiles(workspaceId, preparedItems);

    // Process valid uploads with concurrency limit
    const CONCURRENCY = 2;
    let index = 0;

    const executeNext = async () => {
      if (index >= validUploadTasks.length) return;
      const current = validUploadTasks[index++];

      try {
        await documentApi.uploadDocumentFile({
          workspaceId,
          file: current.file,
          onUploadProgress: (progress) => {
            updateItemProgress(current.id, progress);
          },
        });
        setItemCompleted(current.id);
        // Force immediate invalidation and synchronous cache refetch
        queryClient.invalidateQueries({
          queryKey: DOCUMENT_QUERY_KEYS.all,
        });
        queryClient.refetchQueries({
          queryKey: DOCUMENT_QUERY_KEYS.workspaceList(workspaceId),
        });
        queryClient.invalidateQueries({
          queryKey: ['workspaces', workspaceId],
        });
      } catch (err) {
        const message = getErrorMessage(err, 'Upload failed. Please try again.');
        setItemFailed(current.id, message);
      } finally {
        await executeNext();
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, validUploadTasks.length) }, () =>
      executeNext()
    );
    await Promise.all(workers);
  };

  return { uploadFiles };
}

export default useMultiFileUpload;
