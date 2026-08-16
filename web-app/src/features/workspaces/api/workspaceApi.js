import apiClient from '@/lib/api';
import {
  workspaceListResponseSchema,
  workspaceResponseSchema,
  createWorkspaceRequestSchema,
} from '../schemas/workspaceSchemas';

export const workspaceApi = {
  /**
   * Fetches the user's workspaces list with optional pagination.
   */
  getWorkspaces: async ({ limit = 50, offset = 0 } = {}) => {
    const response = await apiClient.get('/api/v1/workspaces', {
      params: { limit, offset },
    });
    const parseResult = workspaceListResponseSchema.safeParse(response.data);
    if (!parseResult.success) {
      console.warn('WorkspaceList schema validation warning:', parseResult.error);
      return response.data;
    }
    return parseResult.data;
  },

  /**
   * Fetches archived workspaces for the current user.
   */
  getArchivedWorkspaces: async ({ limit = 50, offset = 0 } = {}) => {
    const response = await apiClient.get('/api/v1/workspaces/archived/list', {
      params: { limit, offset },
    });
    const parseResult = workspaceListResponseSchema.safeParse(response.data);
    if (!parseResult.success) {
      console.warn('ArchivedWorkspaceList schema validation warning:', parseResult.error);
      return response.data;
    }
    return parseResult.data;
  },

  /**
   * Fetches a single workspace by ID.
   */
  getWorkspaceById: async (workspaceId) => {
    const response = await apiClient.get(`/api/v1/workspaces/${workspaceId}`);
    const parseResult = workspaceResponseSchema.safeParse(response.data);
    if (!parseResult.success) {
      console.warn('WorkspaceResponse schema validation warning:', parseResult.error);
      return response.data;
    }
    return parseResult.data;
  },

  /**
   * Creates a new workspace.
   */
  createWorkspace: async (data) => {
    const validatedPayload = createWorkspaceRequestSchema.parse(data);
    const response = await apiClient.post('/api/v1/workspaces', validatedPayload);
    const parseResult = workspaceResponseSchema.safeParse(response.data);
    if (!parseResult.success) {
      console.warn('WorkspaceResponse schema validation warning on create:', parseResult.error);
      return response.data;
    }
    return parseResult.data;
  },

  /**
   * Updates an existing workspace.
   */
  updateWorkspace: async (workspaceId, data) => {
    const response = await apiClient.patch(`/api/v1/workspaces/${workspaceId}`, data);
    const parseResult = workspaceResponseSchema.safeParse(response.data);
    if (!parseResult.success) {
      console.warn('WorkspaceResponse schema validation warning on update:', parseResult.error);
      return response.data;
    }
    return parseResult.data;
  },

  /**
   * Archives a workspace.
   */
  archiveWorkspace: async (workspaceId) => {
    const response = await apiClient.post(`/api/v1/workspaces/${workspaceId}/archive`);
    return response.data;
  },

  /**
   * Restores an archived workspace.
   */
  restoreWorkspace: async (workspaceId) => {
    const response = await apiClient.post(`/api/v1/workspaces/${workspaceId}/restore`);
    return response.data;
  },

  /**
   * Deletes a workspace.
   */
  deleteWorkspace: async (workspaceId) => {
    const response = await apiClient.delete(`/api/v1/workspaces/${workspaceId}`);
    return response.data;
  },

  /**
   * Checks workspace name availability in real time.
   */
  checkNameAvailability: async (name, excludeWorkspaceId = null) => {
    const params = { name };
    if (excludeWorkspaceId) {
      params.exclude_workspace_id = excludeWorkspaceId;
    }
    const response = await apiClient.get('/api/v1/workspaces/check-name', { params });
    return response.data;
  },
};

export default workspaceApi;
