import apiClient from '@/lib/api';

export const summaryApi = {
  /**
   * Fetches the generated workspace summary from workspace-service.
   */
  getWorkspaceSummary: async (workspaceId) => {
    const response = await apiClient.get(`/api/v1/workspaces/${workspaceId}/summary`);
    return response.data;
  },

  /**
   * Triggers Gemini 2.5 Flash workspace summary generation via ai-service.
   */
  generateWorkspaceSummary: async (workspaceId) => {
    const response = await apiClient.post(`/api/v1/ai/workspaces/${workspaceId}/summary`);
    return response.data;
  },
};

export default summaryApi;
