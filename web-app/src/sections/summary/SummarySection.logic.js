/**
 * SummarySection — Business Logic Layer
 *
 * Fetches workspace summary API payload and handles manual generation trigger.
 * Passes raw state directly to layout layer.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/api/client';
import { useAuth } from '@/hooks/useAuth';

export function useSummarySection(workspaceId) {
  const { user } = useAuth();

  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    setError(null);

    try {
      const headers = {};
      if (user?.id) headers['X-User-ID'] = user.id;
      if (user?.email) headers['X-User-Email'] = user.email;

      const res = await apiClient.get(`/api/v1/workspaces/${workspaceId}/summary`, { headers });
      setSummaryData(res.data);
    } catch (err) {
      console.error('[SummarySection] Failed to fetch summary:', err);
      setError(err?.response?.data || err?.message || 'Failed to load summary');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, user]);

  const handleGenerateSummary = useCallback(async () => {
    if (!workspaceId) return;
    setIsGenerating(true);
    setError(null);

    try {
      const headers = {};
      if (user?.id) headers['X-User-ID'] = user.id;
      if (user?.email) headers['X-User-Email'] = user.email;

      await apiClient.post(`/api/v1/workspaces/${workspaceId}/summary`, {}, { headers });
    } catch (err) {
      console.error('[SummarySection] Summary generation failed to start:', err);
      setError(err?.response?.data || err?.message || 'Generation request failed');
      setIsGenerating(false);
    }
  }, [workspaceId, user]);

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
      } catch (e) {
        /* silent catch */
      }
    };

    return () => eventSource.close();
  }, [workspaceId, fetchSummary]);

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
