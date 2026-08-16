import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi } from '../api/documentApi';
import { STORAGE_KEYS } from '@/config/constants';

export const DOCUMENT_QUERY_KEYS = {
  all: ['documents'],
  workspaceList: (workspaceId) => ['documents', 'workspace', workspaceId],
  detail: (documentId) => ['documents', 'detail', documentId],
  parseResult: (documentId) => ['documents', 'parse-result', documentId],
};

/**
 * Hook to subscribe to workspace Server-Sent Events (SSE) for live document indexing and status updates.
 */
export function useWorkspaceDocumentSSE(workspaceId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspaceId || typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
      return;
    }

    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    const sseUrl = `${baseURL}/api/v1/workspaces/${workspaceId}/events${tokenParam}`;

    let eventSource;
    try {
      eventSource = new EventSource(sseUrl, { withCredentials: true });

      const handleEvent = (event) => {
        try {
          const payload = event.data ? JSON.parse(event.data) : null;
          // Invalidate and refetch workspace document queries to refresh status live
          queryClient.invalidateQueries({
            queryKey: DOCUMENT_QUERY_KEYS.all,
          });
          queryClient.refetchQueries({
            queryKey: DOCUMENT_QUERY_KEYS.workspaceList(workspaceId),
          });

          if (payload?.resource_id || payload?.document_id) {
            const docId = payload.resource_id || payload.document_id;
            queryClient.invalidateQueries({
              queryKey: DOCUMENT_QUERY_KEYS.detail(docId),
            });
            queryClient.invalidateQueries({
              queryKey: DOCUMENT_QUERY_KEYS.parseResult(docId),
            });
          }
          // Invalidate learning path and summary if related events arrive
          queryClient.invalidateQueries({
            queryKey: ['workspace-learning-path', workspaceId],
          });
          queryClient.invalidateQueries({
            queryKey: ['workspace-summary', workspaceId],
          });
          queryClient.invalidateQueries({
            queryKey: ['workspaces', workspaceId],
          });
          queryClient.invalidateQueries({
            queryKey: ['workspaces'],
          });
          queryClient.invalidateQueries({
            queryKey: ['workspace-members'],
          });
        } catch {
          // Fallback invalidation on generic message
          queryClient.invalidateQueries({
            queryKey: DOCUMENT_QUERY_KEYS.all,
          });
          queryClient.refetchQueries({
            queryKey: DOCUMENT_QUERY_KEYS.workspaceList(workspaceId),
          });
          queryClient.invalidateQueries({
            queryKey: ['workspace-learning-path', workspaceId],
          });
          queryClient.invalidateQueries({
            queryKey: ['workspace-summary', workspaceId],
          });
        }
      };

      eventSource.onmessage = handleEvent;
      eventSource.addEventListener('VectorIndexing', handleEvent);
      eventSource.addEventListener('DocumentParsed', handleEvent);
      eventSource.addEventListener('document.status_changed', handleEvent);
      eventSource.addEventListener('workspace.event', handleEvent);
      eventSource.addEventListener('workspace.learning_path.updated', handleEvent);
      eventSource.addEventListener('workspace.summary.updated', handleEvent);
      eventSource.addEventListener('LearningPathGeneration', handleEvent);
      eventSource.addEventListener('SummaryGeneration', handleEvent);
      eventSource.addEventListener('LearningUnitGeneration', handleEvent);

      eventSource.onerror = () => {
        // SSE handles reconnection automatically
      };
    } catch (e) {
      console.warn('SSE connection error:', e);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [workspaceId, queryClient]);
}

/**
 * Hook to query all documents for a workspace with real-time SSE updates.
 */
export function useWorkspaceDocumentsQuery(workspaceId) {
  // Subscribe to real-time Server-Sent Events (SSE)
  useWorkspaceDocumentSSE(workspaceId);

  return useQuery({
    queryKey: DOCUMENT_QUERY_KEYS.workspaceList(workspaceId),
    queryFn: () => documentApi.getWorkspaceDocuments(workspaceId),
    enabled: !!workspaceId,
    staleTime: 0, // Zero stale time ensures instant UI refresh upon completion
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
      queryClient.invalidateQueries({ queryKey: DOCUMENT_QUERY_KEYS.all });
      queryClient.refetchQueries({ queryKey: DOCUMENT_QUERY_KEYS.workspaceList(workspaceId) });
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId] });
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
      queryClient.invalidateQueries({ queryKey: DOCUMENT_QUERY_KEYS.all });
      queryClient.refetchQueries({ queryKey: DOCUMENT_QUERY_KEYS.workspaceList(workspaceId) });
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId] });
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
      queryClient.invalidateQueries({ queryKey: DOCUMENT_QUERY_KEYS.all });
      queryClient.refetchQueries({ queryKey: DOCUMENT_QUERY_KEYS.workspaceList(workspaceId) });
      onSuccess?.(data);
    },
    onError: (err) => {
      onError?.(err);
    },
  });
}
