import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
 * Hook to send user questions to the AI Tutor RAG endpoint.
 * 
 * Note on Cache Architecture:
 * This is a stateless LLM inference call. Responses are received
 * and saved directly into the persistent workspace chat thread.
 */
export function useSendRAGMessageMutation(workspaceId) {
  return useMutation({
    mutationKey: ['workspace-rag-chat', workspaceId],
    mutationFn: ({ question, topK = 5 }) => sendRAGChatMessage(workspaceId, question, topK),
    onError: (err) => {
      const errorMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Failed to get answer from AI Tutor. Ensure documents are indexed.';
      toast.error(errorMsg);
    },
  });
}

export default useWorkspaceChatQuery;
