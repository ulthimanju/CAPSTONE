import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiClient } from '../services/api/client';
import { useAuth } from '../hooks/useAuth';
import {
  useDocumentEvents,
  useSummaryEvents,
  useLearningPathEvents,
  useWorkspaceEvents,
} from '../providers/SSEProvider';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children, activeWorkspaceId }) {
  const { user } = useAuth();

  const [workspaces, setWorkspaces] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [learningPath, setLearningPath] = useState(null);

  const [loading, setLoading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [learningPathLoaded, setLearningPathLoaded] = useState(false);

  // REST API Refetchers
  const refetchWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      const res = await apiClient.get('/api/v1/workspaces', { headers });
      const list = res.data.workspaces || [];
      setWorkspaces(list);
      if (activeWorkspaceId) {
        setWorkspace(list.find((w) => w.id === activeWorkspaceId) || null);
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeWorkspaceId]);

  const refetchDocuments = useCallback(async (wsId = activeWorkspaceId) => {
    if (!wsId) return;
    try {
      setDocsLoading(true);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      const res = await apiClient.get(`/api/v1/documents?workspace_id=${wsId}`, { headers });
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setDocsLoading(false);
    }
  }, [user?.id, activeWorkspaceId]);

  const refetchSummary = useCallback(async (wsId = activeWorkspaceId) => {
    if (!wsId) return;
    try {
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      const res = await apiClient.get(`/api/v1/workspaces/${wsId}/summary`, { headers });
      setSummary((res.data && res.data.summary) || null);
      setSummaryLoaded(true);
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  }, [user?.id, activeWorkspaceId]);

  const refetchLearningPath = useCallback(async (wsId = activeWorkspaceId) => {
    if (!wsId) return;
    try {
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      const res = await apiClient.get(`/api/v1/workspaces/${wsId}/learning-path`, { headers });
      setLearningPath((res.data && res.data.learning_path) || null);
      setLearningPathLoaded(true);
    } catch (err) {
      console.error('Failed to load learning path:', err);
    }
  }, [user?.id, activeWorkspaceId]);

  // Automatic SSE Domain Invalidation Wireup
  useDocumentEvents(activeWorkspaceId, useCallback(() => {
    refetchDocuments(activeWorkspaceId);
  }, [activeWorkspaceId, refetchDocuments]));

  useSummaryEvents(activeWorkspaceId, useCallback(() => {
    setSummaryLoaded(false);
    refetchSummary(activeWorkspaceId);
  }, [activeWorkspaceId, refetchSummary]));

  useLearningPathEvents(activeWorkspaceId, useCallback(() => {
    setLearningPathLoaded(false);
    refetchLearningPath(activeWorkspaceId);
  }, [activeWorkspaceId, refetchLearningPath]));

  useWorkspaceEvents(activeWorkspaceId, useCallback(() => {
    refetchWorkspaces();
  }, [refetchWorkspaces]));

  const value = {
    workspaces,
    workspace,
    documents,
    summary,
    learningPath,
    loading,
    docsLoading,
    summaryLoaded,
    learningPathLoaded,
    refetchWorkspaces,
    refetchDocuments,
    refetchSummary,
    refetchLearningPath,
    setSummary,
    setLearningPath,
    setDocuments,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceStore() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspaceStore must be used within a WorkspaceProvider');
  }
  return context;
}
