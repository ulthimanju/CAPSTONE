/**
 * SummarySection — Business Logic Layer
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/services/api/client';
import { useAuth } from '@/hooks/useAuth';

export function useSummarySection(workspaceId) {
  const { user } = useAuth();

  // Stable ref for user so fetchSummary doesn't recreate on every render
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Stable fetchSummary — only recreates when workspaceId changes, not user
  const fetchSummary = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    setError(null);

    try {
      const headers = {};
      if (userRef.current?.id) headers['X-User-ID'] = userRef.current.id;
      if (userRef.current?.email) headers['X-User-Email'] = userRef.current.email;

      const res = await apiClient.get(`/api/v1/workspaces/${workspaceId}/summary`, { headers });
      setSummaryData(res.data);
    } catch (err) {
      console.error('[SummarySection] Failed to fetch summary:', err);
      setError(err?.response?.data || err?.message || 'Failed to load summary');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]); // no `user` dep — reads via stable ref

  const handleGenerateSummary = useCallback(async () => {
    if (!workspaceId) return;
    setIsGenerating(true);
    setError(null);

    try {
      const headers = {};
      if (userRef.current?.id) headers['X-User-ID'] = userRef.current.id;
      if (userRef.current?.email) headers['X-User-Email'] = userRef.current.email;

      await apiClient.post(`/api/v1/workspaces/${workspaceId}/summary`, {}, { headers });
    } catch (err) {
      console.error('[SummarySection] Summary generation failed to start:', err);
      setError(err?.response?.data || err?.message || 'Generation request failed');
      setIsGenerating(false);
    }
  }, [workspaceId]); // no `user` dep

  // SSE for real-time generation updates — stable because fetchSummary is now stable
  useEffect(() => {
    if (!workspaceId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const sseUrl = token
      ? `/api/v1/workspaces/${workspaceId}/events?token=${encodeURIComponent(token)}`
      : `/api/v1/workspaces/${workspaceId}/events`;

    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (
          (data.event_name === 'SummaryGeneration' || data.event === 'SummaryGeneration') &&
          data.workspace_id === workspaceId
        ) {
          if (data.status === 'COMPLETED') {
            setIsGenerating(false);
            fetchSummary();
          } else if (data.status === 'FAILED') {
            setIsGenerating(false);
            setError(data.message || 'Generation failed');
          }
        }
      } catch (e) { /* silent */ }
    };

    return () => eventSource.close();
  }, [workspaceId, fetchSummary]); // fetchSummary is now stable

  // Initial fetch — runs once on mount (workspaceId changes)
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summaryData,
    isLoading,
    isGenerating,
    error,
    refetch: fetchSummary,
    generateSummary: handleGenerateSummary,
  };
}
