import apiClient from '@/lib/api';
import { workspaceListResponseSchema, workspaceResponseSchema } from '../schemas/workspaceSchemas';

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
};

export default workspaceApi;
