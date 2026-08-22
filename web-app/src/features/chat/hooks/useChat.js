import { useQuery, useMutation, useQueryClient, useIsMutating } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchWorkspaceChat,
  saveWorkspaceChat,
  clearWorkspaceChat,
  sendRAGChatMessage,
  sendRAGChatMessageStream,
} from '../api/chatApi';
import { useCurrentUser } from '@/features/auth/hooks/useAuth';
import { chatKeys } from './chatKeys';

export { chatKeys };

/**
 * Hook to fetch persistent private chat history for a workspace and current user.
 */
export function useWorkspaceChatQuery(workspaceId) {
  const { user } = useCurrentUser();
  const userId = user?.id;

  return useQuery({
    queryKey: chatKeys.workspace(workspaceId, userId),
    queryFn: () => fetchWorkspaceChat(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to persist user-scoped workspace chat conversation history.
 * 
 * Zero-Read Optimistic Update:
 * Directly syncs the saved messages payload to the user's isolated cache slice
 * with zero redundant background GET refetches.
 */
export function useSaveWorkspaceChatMutation(workspaceId) {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const userId = user?.id;
  const targetKey = chatKeys.workspace(workspaceId, userId);

  return useMutation({
    mutationFn: (messages) => saveWorkspaceChat(workspaceId, messages),
    onMutate: async (messages) => {
      await queryClient.cancelQueries({ queryKey: targetKey });
      const previousChat = queryClient.getQueryData(targetKey);
      queryClient.setQueryData(targetKey, {
        messages: Array.isArray(messages) ? messages : [],
      });
      return { previousChat, targetKey };
    },
    onError: (err, _messages, context) => {
      console.error('Failed to save chat history:', err);
      if (context?.previousChat && context?.targetKey) {
        queryClient.setQueryData(context.targetKey, context.previousChat);
      }
    },
    onSuccess: (_, messages, context) => {
      const key = context?.targetKey || targetKey;
      queryClient.setQueryData(key, {
        messages: Array.isArray(messages) ? messages : [],
      });
    },
  });
}

/**
 * Hook to track whether a RAG inference query is currently executing for this workspace/user.
 * Queries TanStack Query's global MutationCache so it survives component unmounts and route changes.
 */
export function useIsRAGPending(workspaceId) {
  const { user } = useCurrentUser();
  const userId = user?.id;
  const count = useIsMutating({
    mutationKey: ['workspace-rag-chat', workspaceId, userId || 'current'],
  });
  return count > 0;
}

/**
 * Hook to send user questions to the AI Tutor RAG endpoint with real-time SSE streaming.
 * Scoped to the individual authenticated user within the workspace.
 */
export function useSendRAGMessageMutation(workspaceId) {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const userId = user?.id;
  const userChatKey = chatKeys.workspace(workspaceId, userId);

  return useMutation({
    mutationKey: ['workspace-rag-chat', workspaceId, userId || 'current'],
    mutationFn: async ({ question, topK = 5, workspaceCodeLanguage = null, domainType = null }) => {
      const userMessage = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        role: 'user',
        content: question,
        timestamp: new Date().toISOString(),
      };

      const assistantMsgId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + 1);
      const assistantPlaceholder = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        citations: [],
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };

      const cached = queryClient.getQueryData(userChatKey);
      const prevMessages = Array.isArray(cached?.messages) ? cached.messages : [];
      const updatedWithUser = [...prevMessages, userMessage];

      // Optimistically update query cache immediately with user message and streaming placeholder
      queryClient.setQueryData(userChatKey, {
        messages: [...updatedWithUser, assistantPlaceholder],
      });

      // Persist user message to the backend immediately
      try {
        await saveWorkspaceChat(workspaceId, updatedWithUser);
      } catch (err) {
        console.warn('Failed to persist user message immediately:', err);
      }

      let receivedCitations = [];
      let data = null;

      try {
        if (typeof sendRAGChatMessageStream === 'function') {
          let pendingAccumulated = '';
          let rafId = null;

          const flushBatch = () => {
            if (rafId) {
              if (typeof cancelAnimationFrame !== 'undefined') {
                cancelAnimationFrame(rafId);
              }
              rafId = null;
            }
            queryClient.setQueryData(userChatKey, (old) => {
              const msgs = Array.isArray(old?.messages) ? [...old.messages] : [];
              const targetIdx = msgs.findIndex((m) => m.id === assistantMsgId);
              if (targetIdx !== -1) {
                msgs[targetIdx] = {
                  ...msgs[targetIdx],
                  content: pendingAccumulated,
                  citations: receivedCitations,
                };
              }
              return { messages: msgs };
            });
          };

          const streamResult = await sendRAGChatMessageStream({
            workspaceId,
            question,
            topK,
            workspaceCodeLanguage,
            domainType,
            onCitations: (cites) => {
              receivedCitations = cites;
            },
            onChunk: (_chunk, accumulated) => {
              pendingAccumulated = accumulated;
              if (!rafId) {
                if (typeof requestAnimationFrame !== 'undefined') {
                  rafId = requestAnimationFrame(() => {
                    rafId = null;
                    flushBatch();
                  });
                } else {
                  flushBatch();
                }
              }
            },
          });

          // Final flush to guarantee any remaining characters are synced
          flushBatch();

          if (streamResult && (streamResult.answer || streamResult.data)) {
            data = streamResult.data || streamResult;
          }
        }
      } catch (streamErr) {
        console.warn('Streaming failed, attempting fallback to standard generation:', streamErr);
      }

      if (!data) {
        const fallbackData = domainType
          ? await sendRAGChatMessage(workspaceId, question, topK, workspaceCodeLanguage, domainType)
          : await sendRAGChatMessage(workspaceId, question, topK, workspaceCodeLanguage);
        data = fallbackData;
      }

      return { data, userMessage, assistantMsgId };
    },
    onSuccess: ({ data, assistantMsgId }) => {
      const assistantMessage = {
        id: assistantMsgId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + 1)),
        role: 'assistant',
        content: data.answer,
        citations: data.citations || [],
        timestamp: new Date().toISOString(),
      };

      const latestCached = queryClient.getQueryData(userChatKey);
      const baseMessages = Array.isArray(latestCached?.messages) ? latestCached.messages : [];
      const filtered = baseMessages.filter((m) => m.id !== assistantMsgId && !m.isStreaming);
      const updated = [...filtered, assistantMessage];

      queryClient.setQueryData(userChatKey, {
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

      const latestCached = queryClient.getQueryData(userChatKey);
      const baseMessages = Array.isArray(latestCached?.messages) ? latestCached.messages : [];
      const filtered = baseMessages.filter((m) => !m.isStreaming);
      const updated = [...filtered, assistantErrorMessage];

      queryClient.setQueryData(userChatKey, {
        messages: updated,
      });

      saveWorkspaceChat(workspaceId, updated).catch((saveErr) => {
        console.error('Failed to save error response:', saveErr);
      });

      toast.error(errMsg);
    },
  });
}

/**
 * Hook to clear private chat history for the current user in a workspace.
 */
export function useClearWorkspaceChatMutation(workspaceId) {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const userId = user?.id;
  const targetKey = chatKeys.workspace(workspaceId, userId);

  return useMutation({
    mutationFn: () => clearWorkspaceChat(workspaceId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: targetKey });
      const previousChat = queryClient.getQueryData(targetKey);
      queryClient.setQueryData(targetKey, { messages: [] });
      return { previousChat, targetKey };
    },
    onError: (err, _, context) => {
      console.error('Failed to clear chat history:', err);
      if (context?.previousChat && context?.targetKey) {
        queryClient.setQueryData(context.targetKey, context.previousChat);
      }
      toast.error('Failed to clear chat history');
    },
    onSuccess: (_, __, context) => {
      const key = context?.targetKey || targetKey;
      queryClient.setQueryData(key, { messages: [] });
      toast.success('Chat cleared');
    },
  });
}

export default useWorkspaceChatQuery;
