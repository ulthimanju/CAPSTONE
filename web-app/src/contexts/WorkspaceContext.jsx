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

  // Helper function to check if a server document matches an optimistic entry
  const isDocReconciled = (optDoc, serverDocs) => {
    return serverDocs.some((d) => {
      if (optDoc.upload_id && (d.upload_id || d.storage_metadata_json?.upload_id)) {
        const serverUploadId = d.upload_id || d.storage_metadata_json?.upload_id;
        if (serverUploadId === optDoc.upload_id) return true;
      }
      if (d.id === optDoc.id) return true;
      // Fallback matching
      return d.filename === optDoc.filename || d.original_filename === optDoc.filename;
    });
  };

  // Optimistic Doc Helpers
  const addOptimisticDoc = useCallback((doc) => {
    const uploadId = doc.upload_id || `upl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const tempId = doc.id || `opt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const optEntry = {
      id: tempId,
      upload_id: uploadId,
      filename: doc.filename,
      original_filename: doc.filename,
      status: doc.status || 'UPLOADING',
      created_at: new Date().toISOString(),
      file_size_bytes: doc.file_size_bytes || 0,
      isOptimistic: true,
      ...doc,
    };
    setOptimisticDocs((prev) => [...prev, optEntry]);
    return optEntry;
  }, []);

  const updateOptimisticDoc = useCallback((idOrUploadId, patch) => {
    setOptimisticDocs((prev) =>
      prev.map((doc) =>
        doc.id === idOrUploadId || doc.upload_id === idOrUploadId
          ? { ...doc, ...patch }
          : doc
      )
    );
  }, []);

  const removeOptimisticDoc = useCallback((idOrUploadId) => {
    setOptimisticDocs((prev) =>
      prev.filter((doc) => doc.id !== idOrUploadId && doc.upload_id !== idOrUploadId)
    );
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

      const selectedWorkspace = activeWorkspaceId
        ? list.find((w) => w.id === activeWorkspaceId)
        : null;

      setWorkspace(selectedWorkspace || list[0] || null);
    } catch (err) {
      console.error('Failed to load workspaces:', err);
      setWorkspaces([]);
      setWorkspace(null);
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

      // Reconcile optimistic docs: remove entries that match server state by upload_id or fallback
      setOptimisticDocs((prevOpt) =>
        prevOpt.filter((opt) => !isDocReconciled(opt, serverDocs))
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

  // Merge server documents with unreconciled optimistic document placeholders
  const mergedDocuments = useMemo(() => {
    const filterOptimistic = optimisticDocs.filter((opt) => !isDocReconciled(opt, documents));
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
    setSummaryLoaded,
    setLearningPathLoaded,
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
