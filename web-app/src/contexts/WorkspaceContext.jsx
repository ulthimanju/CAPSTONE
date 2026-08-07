import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { apiClient } from '../services/api/client';
import { useAuth } from '../hooks/useAuth';
import { useSSE } from '../providers/SSEProvider';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children, activeWorkspaceId }) {
  const { user } = useAuth();
  const { registerRefreshHandler } = useSSE();

  const [workspaces, setWorkspaces] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [learningPath, setLearningPath] = useState(null);

  const [loading, setLoading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [learningPathLoaded, setLearningPathLoaded] = useState(false);

  // Optimistic UI State
  const [optimisticDocs, setOptimisticDocs] = useState([]);
  const [optimisticOps, setOptimisticOps] = useState([]);

  // Optimistic Doc Helpers
  const addOptimisticDoc = useCallback((doc) => {
    const tempId = doc.id || `opt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const optEntry = {
      id: tempId,
      filename: doc.filename,
      original_filename: doc.filename,
      status: doc.status || 'UPLOADING',
      created_at: new Date().toISOString(),
      file_size_bytes: doc.file_size_bytes || 0,
      isOptimistic: true,
      ...doc,
    };
    setOptimisticDocs((prev) => [...prev, optEntry]);
    return tempId;
  }, []);

  const updateOptimisticDoc = useCallback((id, patch) => {
    setOptimisticDocs((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc))
    );
  }, []);

  const removeOptimisticDoc = useCallback((id) => {
    setOptimisticDocs((prev) => prev.filter((doc) => doc.id !== id));
  }, []);

  // Optimistic Operation Helpers (Summary, Learning Path, Workspace Create/Rename)
  const addOptimisticOp = useCallback((op) => {
    const id = op.id || `op-${Date.now()}`;
    const entry = { id, status: 'running', ...op };
    setOptimisticOps((prev) => [...prev, entry]);
    return id;
  }, []);

  const removeOptimisticOp = useCallback((id) => {
    setOptimisticOps((prev) => prev.filter((op) => op.id !== id));
  }, []);

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
      const serverDocs = res.data.documents || [];
      setDocuments(serverDocs);

      // Reconcile optimistic docs: remove optimistic entries if server has reconciled them
      setOptimisticDocs((prevOpt) =>
        prevOpt.filter(
          (opt) => !serverDocs.some((d) => d.filename === opt.filename || d.original_filename === opt.filename)
        )
      );
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

  // Register Store Refresh Handlers with SSEProvider Invalidation Registry
  useEffect(() => {
    if (!activeWorkspaceId) return;
    const unregDocs = registerRefreshHandler('documents', activeWorkspaceId, () => refetchDocuments(activeWorkspaceId));
    const unregSummary = registerRefreshHandler('summary', activeWorkspaceId, () => {
      setSummaryLoaded(false);
      refetchSummary(activeWorkspaceId);
    });
    const unregLp = registerRefreshHandler('learning_path', activeWorkspaceId, () => {
      setLearningPathLoaded(false);
      refetchLearningPath(activeWorkspaceId);
    });
    const unregWs = registerRefreshHandler('workspace', activeWorkspaceId, () => refetchWorkspaces());

    return () => {
      unregDocs();
      unregSummary();
      unregLp();
      unregWs();
    };
  }, [activeWorkspaceId, registerRefreshHandler, refetchDocuments, refetchSummary, refetchLearningPath, refetchWorkspaces]);

  // Merge server documents with optimistic document placeholders
  const mergedDocuments = useMemo(() => {
    const filterOptimistic = optimisticDocs.filter(
      (opt) => !documents.some((d) => d.filename === opt.filename || d.original_filename === opt.filename)
    );
    return [...filterOptimistic, ...documents];
  }, [optimisticDocs, documents]);

  const value = {
    workspaces,
    workspace,
    documents: mergedDocuments,
    rawServerDocuments: documents,
    summary,
    learningPath,
    loading,
    docsLoading,
    summaryLoaded,
    learningPathLoaded,
    optimisticOps,
    addOptimisticDoc,
    updateOptimisticDoc,
    removeOptimisticDoc,
    addOptimisticOp,
    removeOptimisticOp,
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
