import { useQuery, useMutation, useQueryClient, useIsMutating } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchWorkspaceChat, saveWorkspaceChat, sendRAGChatMessage } from '../api/chatApi';
import { chatKeys } from './chatKeys';

export { chatKeys };

/**
 * Hook to fetch persistent chat history for a workspace.
 */
export function useWorkspaceChatQuery(workspaceId) {
  return useQuery({
    queryKey: chatKeys.workspace(workspaceId),
    queryFn: () => fetchWorkspaceChat(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to persist workspace chat conversation history.
 * 
 * Zero-Read Optimistic Update:
 * Directly syncs the saved messages payload to the cache using setQueryData
 * with zero redundant background GET refetches.
 */
export function useSaveWorkspaceChatMutation(workspaceId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messages) => saveWorkspaceChat(workspaceId, messages),
    onMutate: async (messages) => {
      await queryClient.cancelQueries({ queryKey: chatKeys.workspace(workspaceId) });
      const previousChat = queryClient.getQueryData(chatKeys.workspace(workspaceId));
      queryClient.setQueryData(chatKeys.workspace(workspaceId), {
        messages: Array.isArray(messages) ? messages : [],
      });
      return { previousChat };
    },
    onError: (err, _messages, context) => {
      console.error('Failed to save chat history:', err);
      if (context?.previousChat) {
        queryClient.setQueryData(chatKeys.workspace(workspaceId), context.previousChat);
      }
    },
    onSuccess: (_, messages) => {
      // Instant zero-read cache synchronization
      queryClient.setQueryData(chatKeys.workspace(workspaceId), {
        messages: Array.isArray(messages) ? messages : [],
      });
    },
  });
}

/**
 * Hook to track whether a RAG inference query is currently executing for this workspace.
 * Queries TanStack Query's global MutationCache so it survives component unmounts and route changes.
 */
export function useIsRAGPending(workspaceId) {
  const count = useIsMutating({
    mutationKey: ['workspace-rag-chat', workspaceId],
  });
  return count > 0;
}

/**
 * Hook to send user questions to the AI Tutor RAG endpoint.
 * 
 * Resilient Cache & Persistence Architecture:
 * - Immediately adds user message to TanStack Query cache.
 * - Immediately persists user message to backend DB.
 * - Upon resolution, appends assistant answer and persists, even if the user
 *   navigated to another workspace tab while waiting for generation.
 */
export function useSendRAGMessageMutation(workspaceId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['workspace-rag-chat', workspaceId],
    mutationFn: async ({ question, topK = 5 }) => {
      const userMessage = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        role: 'user',
        content: question,
        timestamp: new Date().toISOString(),
      };

      const cached = queryClient.getQueryData(chatKeys.workspace(workspaceId));
      const prevMessages = Array.isArray(cached?.messages) ? cached.messages : [];
      const updatedWithUser = [...prevMessages, userMessage];

      // Optimistically update query cache immediately
      queryClient.setQueryData(chatKeys.workspace(workspaceId), {
        messages: updatedWithUser,
      });

      // Persist user message to the backend immediately
      try {
        await saveWorkspaceChat(workspaceId, updatedWithUser);
      } catch (err) {
        console.warn('Failed to persist user message immediately:', err);
      }

      const data = await sendRAGChatMessage(workspaceId, question, topK);
      return { data, userMessage };
    },
    onSuccess: ({ data }) => {
      const assistantMessage = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + 1),
        role: 'assistant',
        content: data.answer,
        citations: data.citations || [],
        timestamp: new Date().toISOString(),
      };

      const latestCached = queryClient.getQueryData(chatKeys.workspace(workspaceId));
      const baseMessages = Array.isArray(latestCached?.messages) ? latestCached.messages : [];
      const updated = [...baseMessages, assistantMessage];

      queryClient.setQueryData(chatKeys.workspace(workspaceId), {
        messages: updated,
      });

      saveWorkspaceChat(workspaceId, updated).catch((err) => {
        console.error('Failed to save assistant response:', err);
      });
    },
    onError: (err) => {
      const errMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to get answer from AI Tutor. Ensure documents are indexed.';

      const assistantErrorMessage = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + 1),
        role: 'assistant',
        content: errMsg,
        isError: true,
        timestamp: new Date().toISOString(),
      };

      const latestCached = queryClient.getQueryData(chatKeys.workspace(workspaceId));
      const baseMessages = Array.isArray(latestCached?.messages) ? latestCached.messages : [];
      const updated = [...baseMessages, assistantErrorMessage];

      queryClient.setQueryData(chatKeys.workspace(workspaceId), {
        messages: updated,
      });

      saveWorkspaceChat(workspaceId, updated).catch((saveErr) => {
        console.error('Failed to save error response:', saveErr);
      });

      toast.error(errMsg);
    },
  });
}

export default useWorkspaceChatQuery;
