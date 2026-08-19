import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi } from '../api/documentApi';
import { documentKeys, DOCUMENT_QUERY_KEYS } from './documentKeys';
import { workspaceKeys } from '@/features/workspaces/hooks/workspaceKeys';
import { learningPathKeys } from '@/features/learning-path/hooks/learningPathKeys';
import { STORAGE_KEYS } from '@/config/constants';

export { documentKeys, DOCUMENT_QUERY_KEYS };

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
          const docId = payload?.resource_id || payload?.document_id;

          // Scoped document invalidations
          queryClient.invalidateQueries({
            queryKey: documentKeys.workspaceList(workspaceId),
          });

          if (docId) {
            queryClient.invalidateQueries({
              queryKey: documentKeys.detail(docId),
            });
            queryClient.invalidateQueries({
              queryKey: documentKeys.parseResult(docId),
            });
          }

          // Invalidate learning path, summary, and workspace detail if related events arrive
          const targetUnit = payload?.unit_title || payload?.payload?.unit_title;
          if (targetUnit) {
            queryClient.invalidateQueries({
              queryKey: learningPathKeys.unit(workspaceId, targetUnit),
            });
          } else {
            queryClient.invalidateQueries({
              queryKey: ['learning-path-unit', workspaceId],
            });
          }

          queryClient.invalidateQueries({
            queryKey: learningPathKeys.path(workspaceId),
          });
          queryClient.invalidateQueries({
            queryKey: ['workspace-summary', workspaceId],
          });
          queryClient.invalidateQueries({
            queryKey: workspaceKeys.detail(workspaceId),
          });
        } catch {
          // Fallback scoped invalidation
          queryClient.invalidateQueries({
            queryKey: documentKeys.workspaceList(workspaceId),
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
    queryKey: documentKeys.workspaceList(workspaceId),
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
    queryKey: documentKeys.detail(documentId),
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
    queryKey: documentKeys.parseResult(documentId),
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
      queryClient.invalidateQueries({ queryKey: documentKeys.workspaceList(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
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
    onSuccess: (data, documentId) => {
      if (documentId) {
        queryClient.removeQueries({ queryKey: documentKeys.detail(documentId) });
        queryClient.removeQueries({ queryKey: documentKeys.parseResult(documentId) });
      }
      queryClient.invalidateQueries({ queryKey: documentKeys.workspaceList(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
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
    onSuccess: (data, variables) => {
      const docId = data?.id || variables?.documentId;
      if (data && docId) {
        queryClient.setQueryData(documentKeys.detail(docId), data);
      }
      queryClient.invalidateQueries({ queryKey: documentKeys.workspaceList(workspaceId) });
      onSuccess?.(data);
    },
    onError: (err) => {
      onError?.(err);
    },
  });
}

export default useWorkspaceDocumentsQuery;
