import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi } from '../api/documentApi';

export const DOCUMENT_QUERY_KEYS = {
  all: ['documents'],
  workspaceList: (workspaceId) => ['documents', 'workspace', workspaceId],
  detail: (documentId) => ['documents', 'detail', documentId],
  parseResult: (documentId) => ['documents', 'parse-result', documentId],
};

/**
 * Hook to query all documents for a workspace with auto-polling when files are processing.
 */
export function useWorkspaceDocumentsQuery(workspaceId) {
  return useQuery({
    queryKey: DOCUMENT_QUERY_KEYS.workspaceList(workspaceId),
    queryFn: () => documentApi.getWorkspaceDocuments(workspaceId),
    enabled: !!workspaceId,
    staleTime: 1000 * 15,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.documents) return false;
      const hasProcessing = data.documents.some(
        (doc) => doc.status === 'PENDING' || doc.status === 'PROCESSING' || doc.parse_status === 'PARSING'
      );
      return hasProcessing ? 3000 : false;
    },
  });
}

/**
 * Hook to query a single document by ID.
 */
export function useDocumentQuery(documentId) {
  return useQuery({
    queryKey: DOCUMENT_QUERY_KEYS.detail(documentId),
    queryFn: () => documentApi.getDocumentById(documentId),
    enabled: !!documentId,
    staleTime: 1000 * 30,
  });
}

/**
 * Hook to query document parsed markdown content.
 */
export function useDocumentParseResultQuery(documentId) {
  return useQuery({
    queryKey: DOCUMENT_QUERY_KEYS.parseResult(documentId),
    queryFn: () => documentApi.getDocumentParseResult(documentId),
    enabled: !!documentId,
    staleTime: 1000 * 60,
  });
}

/**
 * Mutation hook for uploading a document file.
 */
export function useUploadDocumentMutation(workspaceId, { onSuccess, onError } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, onUploadProgress }) =>
      documentApi.uploadDocumentFile({ workspaceId, file, onUploadProgress }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: DOCUMENT_QUERY_KEYS.workspaceList(workspaceId) });
      onSuccess?.(data);
    },
    onError: (err) => {
      onError?.(err);
    },
  });
}

/**
 * Mutation hook for deleting a document.
 */
export function useDeleteDocumentMutation(workspaceId, { onSuccess, onError } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId) => documentApi.deleteDocument(documentId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: DOCUMENT_QUERY_KEYS.workspaceList(workspaceId) });
      onSuccess?.(data);
    },
    onError: (err) => {
      onError?.(err);
    },
  });
}

/**
 * Mutation hook for renaming a document.
 */
export function useRenameDocumentMutation(workspaceId, { onSuccess, onError } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, filename }) =>
      documentApi.renameDocument(documentId, filename),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: DOCUMENT_QUERY_KEYS.workspaceList(workspaceId) });
      queryClient.invalidateQueries({ queryKey: DOCUMENT_QUERY_KEYS.detail(data?.id) });
      onSuccess?.(data);
    },
    onError: (err) => {
      onError?.(err);
    },
  });
}
