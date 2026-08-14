/**
 * DocumentsSection — Business Logic Layer
 *
 * Handles fetching documents list, file upload (raw form-data), and deleting documents.
 * Uses stable userRef and runs effects cleanly per workspaceId lifecycle.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/services/api/client';
import { useAuth } from '@/hooks/useAuth';

export function useDocumentsSection(workspaceId) {
  const { user } = useAuth();

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const [documentsData, setDocumentsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDocuments = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    setError(null);

    try {
      const headers = {};
      if (userRef.current?.id) headers['X-User-ID'] = userRef.current.id;
      if (userRef.current?.email) headers['X-User-Email'] = userRef.current.email;

      const res = await apiClient.get(`/api/v1/documents?workspace_id=${workspaceId}`, { headers });
      setDocumentsData(res.data);
    } catch (err) {
      console.error('[DocumentsSection] Failed to fetch documents:', err);
      setError(err?.response?.data || err?.message || 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  const handleUploadFile = useCallback(async (file) => {
    if (!workspaceId || !file) return;
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('workspace_id', workspaceId);
      formData.append('file', file);

      const headers = {
        'Content-Type': 'multipart/form-data',
      };
      if (userRef.current?.id) headers['X-User-ID'] = userRef.current.id;
      if (userRef.current?.email) headers['X-User-Email'] = userRef.current.email;

      await apiClient.post('/api/v1/documents/raw', formData, { headers });
      await fetchDocuments();
    } catch (err) {
      console.error('[DocumentsSection] Upload failed:', err);
      setError(err?.response?.data || err?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [workspaceId, fetchDocuments]);

  const handleDeleteDocument = useCallback(async (documentId) => {
    if (!documentId) return;
    setError(null);

    try {
      const headers = {};
      if (userRef.current?.id) headers['X-User-ID'] = userRef.current.id;
      if (userRef.current?.email) headers['X-User-Email'] = userRef.current.email;

      await apiClient.delete(`/api/v1/documents/${documentId}`, { headers });
      await fetchDocuments();
    } catch (err) {
      console.error('[DocumentsSection] Delete failed:', err);
      setError(err?.response?.data || err?.message || 'Delete failed');
    }
  }, [fetchDocuments]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documentsData,
    isLoading,
    isUploading,
    error,
    refetch: fetchDocuments,
    uploadFile: handleUploadFile,
    deleteDocument: handleDeleteDocument,
  };
}
