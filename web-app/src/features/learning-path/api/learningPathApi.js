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

  /**
   * Fetches the generated learning unit content (summary, flashcards, quiz, problems) from workspace-service.
   */
  getLearningUnitContent: async (workspaceId, unitTitle) => {
    const response = await apiClient.get(`/api/v1/workspaces/${workspaceId}/units/content`, {
      params: { unit_title: unitTitle },
    });
    return response.data;
  },

  /**
   * Triggers Gemini 2.5 Flash single-pass unit content generation via ai-service.
   */
  generateLearningUnitContent: async (workspaceId, payload) => {
    const response = await apiClient.post(`/api/v1/ai/workspaces/${workspaceId}/units/generate`, payload);
    return response.data;
  },

  /**
   * Persists quiz progress and user answers to workspace-service.
   */
  updateQuizProgress: async (workspaceId, { unitTitle, quizJson }) => {
    const response = await apiClient.patch(`/api/v1/workspaces/${workspaceId}/units/quiz-progress`, {
      unit_title: unitTitle,
      quiz_json: quizJson,
    });
    return response.data;
  },
};

export default learningPathApi;
