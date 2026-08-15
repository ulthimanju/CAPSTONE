import apiClient from '@/lib/api';

export const learningPathApi = {
  /**
   * Fetches the generated workspace learning path from workspace-service.
   */
  getWorkspaceLearningPath: async (workspaceId) => {
    const response = await apiClient.get(`/api/v1/workspaces/${workspaceId}/learning-path`);
    return response.data;
  },

  /**
   * Triggers Gemini 2.5 Flash workspace learning path curriculum generation via ai-service.
   */
  generateWorkspaceLearningPath: async (workspaceId) => {
    const response = await apiClient.post(`/api/v1/workspaces/${workspaceId}/learning-path`);
    return response.data;
  },
};

export default learningPathApi;
