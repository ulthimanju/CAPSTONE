import apiClient from '@/lib/api';
import {
  documentListResponseSchema,
  documentResponseSchema,
} from '../schemas/documentSchemas';

export const documentApi = {
  /**
   * Fetches all documents attached to a workspace.
   */
  getWorkspaceDocuments: async (workspaceId, { limit = 50, offset = 0 } = {}) => {
    const response = await apiClient.get('/api/v1/documents', {
      params: { workspace_id: workspaceId, limit, offset },
    });
    const parseResult = documentListResponseSchema.safeParse(response.data);
    if (!parseResult.success) {
      console.warn('DocumentList schema validation warning:', parseResult.error);
      return response.data;
    }
    return parseResult.data;
  },

  /**
   * Fetches a single document by ID.
   */
  getDocumentById: async (documentId) => {
    const response = await apiClient.get(`/api/v1/documents/${documentId}`);
    const parseResult = documentResponseSchema.safeParse(response.data);
    if (!parseResult.success) {
      console.warn('DocumentResponse schema validation warning:', parseResult.error);
      return response.data;
    }
    return parseResult.data;
  },

  /**
   * Uploads a document via multipart/form-data to the raw endpoint.
   */
  uploadDocumentFile: async ({ workspaceId, file, onUploadProgress }) => {
    const formData = new FormData();
    formData.append('workspace_id', workspaceId);
    formData.append('file', file);

    const response = await apiClient.post('/api/v1/documents/raw', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onUploadProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(percentCompleted);
        }
      },
    });

    const parseResult = documentResponseSchema.safeParse(response.data);
    if (!parseResult.success) {
      console.warn('DocumentResponse upload schema validation warning:', parseResult.error);
      return response.data;
    }
    return parseResult.data;
  },

  /**
   * Deletes a document by ID.
   */
  deleteDocument: async (documentId) => {
    const response = await apiClient.delete(`/api/v1/documents/${documentId}`);
    return response.data;
  },

  /**
   * Renames a document by ID.
   */
  renameDocument: async (documentId, original_filename) => {
    const response = await apiClient.patch(`/api/v1/documents/${documentId}`, {
      original_filename,
    });
    return response.data;
  },

  /**
   * Fetches parsed markdown content for a document.
   */
  getDocumentParseResult: async (documentId) => {
    const response = await apiClient.get(`/api/v1/documents/${documentId}/parse-result`);
    return response.data;
  },
};

export default documentApi;
