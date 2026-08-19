import apiClient from '@/lib/api';
import { userResponseSchema } from '../schemas/authSchemas';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const authApi = {
  /**
   * Returns the backend Google OAuth redirect initiation URL.
   */
  getGoogleLoginUrl: () => `${API_BASE}/api/v1/oauth/google/login`,

  /**
   * Exchanges a short-lived single-use authorization code for a JWT access token.
   * Keeps access tokens completely out of URL query parameters and browser history.
   */
  exchangeOAuthCode: async (code) => {
    const response = await apiClient.post('/api/v1/oauth/google/exchange', { code });
    return response.data;
  },

  /**
   * Fetches current authenticated user profile and validates schema at runtime.
   */
  getProfile: async () => {
    const response = await apiClient.get('/api/v1/profile');
    const parseResult = userResponseSchema.safeParse(response.data);
    if (!parseResult.success) {
      console.warn('UserProfile schema validation warning:', parseResult.error);
      return response.data;
    }
    return parseResult.data;
  },

  /**
   * Checks if user has authorized Google Drive tokens.
   */
  checkGoogleDriveStatus: async () => {
    try {
      const response = await apiClient.get('/api/v1/profile/google-token');
      const isLinked = Boolean(
        response.data?.linked ||
        response.data?.status === 'active' ||
        response.data?.access_token
      );
      return { isLinked, data: response.data };
    } catch {
      return { isLinked: false, data: null };
    }
  },

  /**
   * Refreshes JWT access token via single-use rotation.
   */
  refreshToken: async (token) => {
    const payload = token ? { refresh_token: token } : {};
    const response = await apiClient.post('/api/v1/tokens/refresh', payload);
    return response.data;
  },

  /**
   * Fetches active user sessions.
   */
  getSessions: async () => {
    const response = await apiClient.get('/api/v1/sessions');
    return response.data;
  },

  /**
   * Revokes a specific session.
   */
  revokeSession: async (sessionId) => {
    const response = await apiClient.delete(`/api/v1/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Revokes all user sessions.
   */
  revokeAllSessions: async () => {
    const response = await apiClient.post('/api/v1/sessions/logout-all');
    return response.data;
  },
};

export default authApi;
