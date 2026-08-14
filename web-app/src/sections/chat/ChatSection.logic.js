/**
 * ChatSection — Business Logic Layer
 *
 * Handles sending RAG questions (POST /api/v1/rag/chat) with workspace grounding.
 */

import { useState, useCallback } from 'react';
import { apiClient } from '@/services/api/client';
import { useAuth } from '@/hooks/useAuth';

export function useChatSection(workspaceId) {
  const { user } = useAuth();

  const [question, setQuestion] = useState('');
  const [chatResponse, setChatResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSendQuestion = useCallback(async () => {
    if (!workspaceId || !question.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const headers = {};
      if (user?.id) headers['X-User-ID'] = user.id;
      if (user?.email) headers['X-User-Email'] = user.email;

      const res = await apiClient.post(
        '/api/v1/rag/chat',
        {
          workspace_id: workspaceId,
          question: question.trim(),
          top_k: 5,
        },
        { headers }
      );
      setChatResponse(res.data);
    } catch (err) {
      console.error('[ChatSection] RAG Chat failed:', err);
      setError(err?.response?.data || err?.message || 'Chat request failed');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, question, user]);

  return {
    question,
    setQuestion,
    chatResponse,
    isLoading,
    error,
    sendQuestion: handleSendQuestion,
  };
}
