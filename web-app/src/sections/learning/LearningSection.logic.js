/**
 * LearningSection — Business Logic Layer
 *
 * Handles fetching learning path API payload and manual AI generation trigger.
 * Uses stable userRef and runs effects cleanly per workspaceId lifecycle.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/services/api/client';
import { useAuth } from '@/hooks/useAuth';

export function useLearningSection(workspaceId) {
  const { user } = useAuth();

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const [learningData, setLearningData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const fetchLearningPath = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    setError(null);

    try {
      const headers = {};
      if (userRef.current?.id) headers['X-User-ID'] = userRef.current.id;
      if (userRef.current?.email) headers['X-User-Email'] = userRef.current.email;

      const res = await apiClient.get(`/api/v1/workspaces/${workspaceId}/learning-path`, { headers });
      setLearningData(res.data);
    } catch (err) {
      console.error('[LearningSection] Failed to fetch learning path:', err);
      setError(err?.response?.data || err?.message || 'Failed to load learning path');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  const handleGenerateLearningPath = useCallback(async () => {
    if (!workspaceId) return;
    setIsGenerating(true);
    setError(null);

    try {
      const headers = {};
      if (userRef.current?.id) headers['X-User-ID'] = userRef.current.id;
      if (userRef.current?.email) headers['X-User-Email'] = userRef.current.email;

      await apiClient.post(`/api/v1/workspaces/${workspaceId}/learning-path`, {}, { headers });
    } catch (err) {
      console.error('[LearningSection] Learning path generation failed to start:', err);
      setError(err?.response?.data || err?.message || 'Generation request failed');
      setIsGenerating(false);
    }
  }, [workspaceId]);

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
          (data.event_name === 'LearningPathGeneration' || data.event === 'LearningPathGeneration') &&
          data.workspace_id === workspaceId
        ) {
          if (data.status === 'COMPLETED') {
            setIsGenerating(false);
            fetchLearningPath();
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
  }, [workspaceId, fetchLearningPath]);

  useEffect(() => {
    fetchLearningPath();
  }, [fetchLearningPath]);

  return {
    learningData,
    isLoading,
    isGenerating,
    error,
    refetch: fetchLearningPath,
    generateLearningPath: handleGenerateLearningPath,
  };
}
