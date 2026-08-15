import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchWorkspaceChat, saveWorkspaceChat, sendRAGChatMessage } from '../api/chatApi';

export function useWorkspaceChatQuery(workspaceId) {
  return useQuery({
    queryKey: ['workspace-chat', workspaceId],
    queryFn: () => fetchWorkspaceChat(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 60 * 1000,
  });
}

export function useSaveWorkspaceChatMutation(workspaceId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messages) => saveWorkspaceChat(workspaceId, messages),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-chat', workspaceId] });
    },
    onError: (err) => {
      console.error('Failed to save chat history:', err);
    },
  });
}

export function useSendRAGMessageMutation(workspaceId) {
  return useMutation({
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
