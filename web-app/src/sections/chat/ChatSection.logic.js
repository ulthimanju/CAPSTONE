/**
 * ChatSection — Business Logic Layer
 *
 * Automatically fetches/initializes or sends RAG query (POST /api/v1/rag/chat or /search).
 * Directly passes raw received API payloads and initial state to layout layer.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/api/client';
import { useAuth } from '@/hooks/useAuth';

export function useChatSection(workspaceId) {
  const { user } = useAuth();

  const [question, setQuestion] = useState('');
  const [chatResponse, setChatResponse] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
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

  const handleSemanticSearch = useCallback(async () => {
    if (!workspaceId || !question.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const headers = {};
      if (user?.id) headers['X-User-ID'] = user.id;
      if (user?.email) headers['X-User-Email'] = user.email;

      const res = await apiClient.post(
        '/api/v1/rag/search',
        {
          workspace_id: workspaceId,
          query: question.trim(),
          top_k: 5,
        },
        { headers }
      );
      setSearchResults(res.data);
    } catch (err) {
      console.error('[ChatSection] Semantic Search failed:', err);
      setError(err?.response?.data || err?.message || 'Semantic search failed');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, question, user]);

  // Initial auto search/check on section mount so payload container is immediately visible
  useEffect(() => {
    if (workspaceId && !chatResponse && !searchResults) {
      setSearchResults({
        info: "Ready for RAG chat or Semantic Search queries. Enter a prompt above and click 'Ask RAG AI' or 'Semantic Search Only'.",
        workspace_id: workspaceId,
        endpoint_chat: "/api/v1/rag/chat",
        endpoint_search: "/api/v1/rag/search",
        status: "IDLE_AWAITING_INPUT"
      });
    }
  }, [workspaceId]);

  return {
    question,
    setQuestion,
    chatResponse,
    searchResults,
    isLoading,
    error,
    sendQuestion: handleSendQuestion,
    semanticSearch: handleSemanticSearch,
  };
}
