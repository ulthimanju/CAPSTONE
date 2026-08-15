import apiClient from '@/lib/api';
import { userResponseSchema } from '../schemas/authSchemas';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const authApi = {
  /**
   * Returns the backend Google OAuth redirect initiation URL.
   */
  getGoogleLoginUrl: () => `${API_BASE}/api/v1/oauth/google/login`,

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
   * Updates current user display name or avatar URL.
   */
  updateProfile: async (data) => {
    const response = await apiClient.patch('/api/v1/profile', data);
    return response.data;
  },

  /**
   * Checks if user has authorized Google Drive tokens.
   */
  checkGoogleDriveStatus: async () => {
    try {
      const response = await apiClient.get('/api/v1/profile/google-token');
      return { isLinked: !!response.data?.access_token, data: response.data };
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
  getActiveSessions: async () => {
    const response = await apiClient.get('/api/v1/sessions/active');
    return response.data;
  },

  /**
   * Revokes an active session.
   */
  revokeSession: async (sessionId) => {
    const response = await apiClient.delete(`/api/v1/sessions/${sessionId}`);
    return response.data;
  },
};

export default authApi;
